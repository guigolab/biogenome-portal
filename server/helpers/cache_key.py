"""
Helpers for deterministic Redis cache keys from Flask request data and
endpoint decorators that cache JSON HTTP responses.

- GET  routes: key from method + path + sorted query args.
- POST routes: key from method + path + sorted query args + hashed JSON body.

Use :func:`cached_endpoint` on Flask-RESTful ``Resource`` methods that return
:class:`~flask.Response` (JSON bodies only; not streaming).
"""

from __future__ import annotations

import hashlib
import json
from functools import wraps
from typing import Any, Callable

from flask import Response, request


def _stable_dict_hash(payload: Any) -> str:
    """Return a short, stable SHA-1 hex string for any JSON-serialisable payload."""
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha1(canonical.encode()).hexdigest()[:16]


def _sorted_query_string(args) -> str:
    """Normalised, sorted query string from a Werkzeug MultiDict."""
    pairs = sorted(args.items(multi=True))
    return "&".join(f"{k}={v}" for k, v in pairs)


def make_cache_key_for_request(*_args, **_kwargs) -> str:
    """
    Build a stable cache key for the current Flask request.

    GET  → ``<method>:<path>?<sorted_qs>``
    POST → ``<method>:<path>?<sorted_qs>#<body_hash>``

    Extra positional/keyword args (e.g. ``self`` from Flask-RESTful) are ignored.
    """
    base = f"{request.method}:{request.path}"
    qs = _sorted_query_string(request.args)
    if qs:
        base = f"{base}?{qs}"

    if request.method == "POST":
        try:
            body = request.get_json(silent=True, force=True) or {}
        except Exception:
            body = {}
        body_hash = _stable_dict_hash(body)
        base = f"{base}#{body_hash}"

    return base


def cached_endpoint(timeout: int):
    """
    Cache JSON :class:`~flask.Response` bodies in Redis (pickle of body, status, mimetype).

    Usage::

        class MyResource(Resource):
            @cached_endpoint(timeout=900)
            def get(self):
                ...
    """

    def decorator(fn: Callable) -> Callable:
        from services.redis_cache import cache_get, cache_set

        @wraps(fn)
        def wrapper(*args, **kwargs):
            key = make_cache_key_for_request(*args, **kwargs)
            hit = cache_get(key)
            if hit is not None:
                body, status, mimetype = hit
                return Response(body, mimetype=mimetype, status=status)

            resp = fn(*args, **kwargs)
            if isinstance(resp, Response):
                body_text = resp.get_data(as_text=True)
                cache_set(
                    key,
                    (body_text, resp.status_code, resp.mimetype or "application/json"),
                    timeout,
                )
            return resp

        return wrapper

    return decorator
