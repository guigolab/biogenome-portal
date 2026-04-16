"""
Helpers for building deterministic, stable Flask-Caching keys from request data.

- GET  routes: key from route path + sorted query args.
- POST routes: key from route path + sorted query args + sorted/hashed JSON/form body.

Use ``make_cache_key_for_request`` as the ``make_cache_key`` argument to
``@cache.cached()`` on Flask-RESTful Resource methods.
"""

from __future__ import annotations

import hashlib
import json
from functools import wraps
from typing import Any, Callable

from flask import request


def _stable_dict_hash(payload: Any) -> str:
    """Return a short, stable SHA-1 hex string for any JSON-serialisable payload."""
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha1(canonical.encode()).hexdigest()[:16]


def _sorted_query_string(args) -> str:
    """Normalised, sorted query string from a Werkzeug MultiDict."""
    pairs = sorted(args.items(multi=True))
    return "&".join(f"{k}={v}" for k, v in pairs)


def make_cache_key_for_request() -> str:
    """
    Build a stable cache key for the current Flask request.

    GET  → ``<method>:<path>?<sorted_qs>``
    POST → ``<method>:<path>?<sorted_qs>#<body_hash>``
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
    Decorator that applies ``@cache.cached(timeout, make_cache_key)`` using the
    shared ``extensions.cache.cache`` instance.

    Usage::

        class MyResource(Resource):
            @cached_endpoint(timeout=900)
            def get(self):
                ...

            @cached_endpoint(timeout=900)
            def post(self):
                ...
    """
    from extensions.cache import cache

    def decorator(fn: Callable) -> Callable:
        return cache.cached(timeout=timeout, make_cache_key=make_cache_key_for_request)(fn)

    return decorator
