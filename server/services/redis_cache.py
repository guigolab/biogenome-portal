"""
Application cache backed by Redis (redis-py), not Flask-Caching.

- :func:`cache_get` / :func:`cache_set` — pickle-serialised values, shared key prefix.
- :func:`redis_memoize` — function result memoisation (replaces ``@cache.memoize``).
- :func:`init_redis_cache` — optional ping and ``app.extensions['redis_cache']`` registration.

Env: ``REDIS_HOST``, ``REDIS_PORT``, ``REDIS_CACHE_DB`` (default DB ``1``), optional ``REDIS_CACHE_KEY_PREFIX``.
"""

from __future__ import annotations

import hashlib
import logging
import os
import pickle
from functools import wraps
from typing import Any, Callable, Optional

import redis

logger = logging.getLogger(__name__)

KEY_PREFIX = os.environ.get("REDIS_CACHE_KEY_PREFIX", "bgp_api_cache:")

_redis_client: Optional[redis.Redis] = None


def _build_client() -> redis.Redis:
    return redis.Redis(
        host=os.environ.get("REDIS_HOST", "bgp_redis"),
        port=int(os.environ.get("REDIS_PORT", 6379)),
        db=int(os.environ.get("REDIS_CACHE_DB", 1)),
        decode_responses=False,
    )


def get_redis() -> redis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = _build_client()
    return _redis_client


def init_redis_cache(app) -> None:
    r = get_redis()
    app.extensions["redis_cache"] = r
    try:
        r.ping()
    except redis.RedisError:
        app.logger.warning("Redis cache ping failed; cache operations will no-op on error", exc_info=True)


def _full_key(key: str) -> str:
    if key.startswith(KEY_PREFIX):
        return key
    return f"{KEY_PREFIX}{key}"


def cache_get(key: str) -> Any:
    try:
        r = get_redis()
        raw = r.get(_full_key(key))
        if raw is None:
            return None
        return pickle.loads(raw)
    except (redis.RedisError, pickle.PickleError, EOFError):
        logger.exception("redis cache_get failed for key prefix")
        return None


def cache_set(key: str, value: Any, timeout: Optional[int] = None) -> None:
    try:
        r = get_redis()
        payload = pickle.dumps(value, protocol=pickle.HIGHEST_PROTOCOL)
        fk = _full_key(key)
        if timeout is not None and timeout > 0:
            r.setex(fk, timeout, payload)
        else:
            r.set(fk, payload)
    except redis.RedisError:
        logger.exception("redis cache_set failed")


def redis_memoize(timeout: int):
    """Memoise function results in Redis (pickle). Key = module + qualname + hash(args, kwargs)."""

    def decorator(fn: Callable):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            mkey = _memo_storage_key(fn, args, kwargs)
            hit = cache_get(mkey)
            if hit is not None:
                return hit
            result = fn(*args, **kwargs)
            cache_set(mkey, result, timeout)
            return result

        return wrapper

    return decorator


def _memo_storage_key(fn: Callable, args: tuple, kwargs: dict) -> str:
    qual = f"{fn.__module__}.{fn.__qualname__}"
    blob = pickle.dumps((args, kwargs), protocol=pickle.HIGHEST_PROTOCOL)
    digest = hashlib.sha256(blob).hexdigest()[:40]
    return f"memo:{qual}:{digest}"
