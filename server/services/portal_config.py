"""
Backend-authoritative portal configuration (front-config-centralization-plan.md, Phase 4).

Loads ``PORTAL_CONFIG_PATH`` (bind-mounted per instance, see ``bgp-configs/<instance>/portal.json``),
validates it against the canonical JSON Schema, and derives/overrides the fields the backend
owns so they can never disagree with backend env, regardless of what is present in the mounted
file (defense in depth — Phase 2 already stripped these from the data files themselves).

Schema: a byte-identical copy of ``bgp-configs/portal.schema.json`` is bundled at
``server/portal.schema.json`` (the backend image only has ``server/`` copied in — see
``server/Dockerfile``), and CI (``bgp-configs/.github/workflows/build-next-front-ecr.yml``)
fails the build if the two copies (plus ``front/portal.schema.json``) ever drift.

Caching: a per-process in-memory cache keyed on the config file's mtime (``os.stat(...).st_mtime``).
Each call performs a cheap ``stat()``; the file is only re-read and re-validated when the mtime
changes, so an operator editing the mounted file needs no restart. Guarded by a lock for
uWSGI's multi-threaded worker mode (``server/app.ini``); the mtime check is cheap enough to do
under the lock on every call. uWSGI's multi-*process* workers each keep their own cache — no
cross-process invalidation is needed since every process independently notices the new mtime.
"""

from __future__ import annotations

import copy
import json
import logging
import os
import threading
from typing import Any, Optional

import jsonschema
from flask import send_from_directory

logger = logging.getLogger(__name__)

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_SERVER_DIR = os.path.dirname(_BASE_DIR)
_SCHEMA_PATH = os.path.join(_SERVER_DIR, "portal.schema.json")
_DEFAULT_PORTAL_PATH = os.path.join(_SERVER_DIR, "portal_default.json")

# Same config-var convention as `CELERY_BEAT_SCHEDULE_FILE` in `config.py`: a sensible default,
# overridable per deployment (docker-compose mounts `./portal.json` at this exact path).
PORTAL_CONFIG_PATH = os.environ.get("PORTAL_CONFIG_PATH", "/server/configs/portal.json")
PORTAL_ASSETS_DIR = os.environ.get("PORTAL_ASSETS_DIR", "/server/configs/assets")

# Long cache lifetime for instance assets (logos): they rarely change, and an operator who does
# replace one can bust caches by renaming the file (referenced by name in portal.json/footer).
# Not content-hashed/immutable — see docs/front-config-centralization-plan.md Phase 4 notes.
_PORTAL_ASSET_MAX_AGE_SECONDS = 60 * 60 * 24 * 7  # 7 days


class PortalConfigError(Exception):
    """Raised when the mounted portal config exists but fails to parse or validate."""


def _load_schema() -> dict:
    with open(_SCHEMA_PATH, "r", encoding="utf-8") as fh:
        schema = json.load(fh)
    jsonschema.Draft202012Validator.check_schema(schema)
    return schema


# Loaded once per process at import time: the schema is bundled in the image and never changes
# without a redeploy (unlike the mounted portal.json, which is checked for changes on every call).
_SCHEMA = _load_schema()
_VALIDATOR = jsonschema.Draft202012Validator(_SCHEMA)


def _load_default_portal_config() -> dict:
    with open(_DEFAULT_PORTAL_PATH, "r", encoding="utf-8") as fh:
        return json.load(fh)


# Mirrors `front/lib/portal/defaultPortal.json` (kept in sync by hand, same as the front's own
# last-resort default; not schema-enforced in CI since it is a fallback, not a contract).
_DEFAULT_PORTAL_CONFIG = _load_default_portal_config()


class _PortalConfigCache:
    """Per-process cache: guarded by a lock, invalidated by the config file's mtime."""

    def __init__(self) -> None:
        self.lock = threading.Lock()
        self.checked_path: Optional[str] = None
        self.mtime: Optional[float] = None
        self.doc: Optional[dict] = None
        self.error: Optional[PortalConfigError] = None
        self.source: Optional[str] = None  # "mounted" | "default"


_cache = _PortalConfigCache()


def _stat_mtime(path: str) -> Optional[float]:
    try:
        return os.stat(path).st_mtime
    except OSError:
        return None


def _root_taxid_override() -> Optional[str]:
    """`general.rootTaxid` <- `ROOT_NODE` (see `services/taxons.py`); `None` when unset."""
    raw = os.environ.get("ROOT_NODE")
    stripped = raw.strip() if raw else ""
    return stripped or None


def _goat_override() -> bool:
    """`general.goat` <- `bool(GOAT_PROJECT_NAME)` (see `db/constants.py`)."""
    raw = os.environ.get("GOAT_PROJECT_NAME")
    return bool(raw and raw.strip())


def _apply_overrides(raw_doc: dict) -> dict:
    """
    Derive/override backend-owned fields so they can never disagree with backend env, even if a
    stray value is present in the mounted JSON (Phase 2 already strips these from the data files
    for every instance except the legacy `biogenome-portal-cbp` exception, but this loader is
    authoritative regardless of what is in the file).

    `general.cms` is intentionally left untouched: per the plan, it is a UI policy decision, not
    a backend fact.

    `general.basePath` is deliberately NOT added here — see the module docstring section in
    front-config-centralization-plan.md Phase 4 and the decision note in this module's tests /
    the accompanying report: nothing under `front/` reads a `general.basePath` field today (the
    Next.js `basePath` is a build-time constant baked from `NEXT_PUBLIC_BASE_PATH`, not something
    re-readable from a runtime JSON document), and the schema has no such concept. Consolidating
    `basePath` at runtime is explicitly Phase 6's job; adding an unread field now would just be a
    new dead knob, which is exactly what Phase 0 was about removing.
    """
    doc = copy.deepcopy(raw_doc) if isinstance(raw_doc, dict) else {}
    general = dict(doc.get("general") or {})
    general["rootTaxid"] = _root_taxid_override()
    general["goat"] = _goat_override()
    doc["general"] = general
    return doc


def _validate(doc: Any, path: str) -> None:
    errors = sorted(_VALIDATOR.iter_errors(doc), key=lambda e: list(e.path))
    if not errors:
        return
    first = errors[0]
    prop = ".".join(str(p) for p in first.path) or "<root>"
    more = f" (+{len(errors) - 1} more violation(s))" if len(errors) > 1 else ""
    raise PortalConfigError(
        f"portal config at '{path}' failed schema validation at '{prop}': {first.message}{more}"
    )


def _load_and_validate(path: str) -> dict:
    try:
        with open(path, "r", encoding="utf-8") as fh:
            raw_text = fh.read()
    except OSError as exc:
        raise PortalConfigError(f"portal config at '{path}' could not be read: {exc}") from exc

    try:
        doc = json.loads(raw_text)
    except json.JSONDecodeError as exc:
        raise PortalConfigError(f"portal config at '{path}' is not valid JSON: {exc}") from exc

    if not isinstance(doc, dict):
        raise PortalConfigError(f"portal config at '{path}' must be a JSON object, got {type(doc).__name__}")

    _validate(doc, path)
    return doc


def get_portal_config() -> dict:
    """
    Return the effective, validated, backend-derived portal config.

    - File present and valid: returns the mounted document with backend-owned fields overridden.
    - File present but invalid (bad JSON / schema violation): raises :class:`PortalConfigError`
      with a specific message (which property, what's wrong) — this is a loud, non-silent failure.
    - File absent (unmounted container, bootstrap/dev environment): falls back to the built-in
      default, logging a warning once per process per state transition.
    """
    path = PORTAL_CONFIG_PATH
    mtime = _stat_mtime(path)

    with _cache.lock:
        cache_is_fresh = (
            _cache.checked_path == path
            and _cache.mtime == mtime
            and (_cache.doc is not None or _cache.error is not None)
        )
        if cache_is_fresh:
            if _cache.error is not None:
                raise _cache.error
            assert _cache.doc is not None
            return _cache.doc

        if mtime is None:
            if _cache.source != "default":
                logger.warning(
                    "Portal config not found at '%s'; falling back to the built-in default "
                    "(mirrors front/lib/portal/defaultPortal.json). Mount ./portal.json at this "
                    "path to serve real branding.",
                    path,
                )
            doc = _apply_overrides(_DEFAULT_PORTAL_CONFIG)
            _cache.doc = doc
            _cache.error = None
            _cache.source = "default"
            _cache.mtime = mtime
            _cache.checked_path = path
            return doc

        try:
            raw_doc = _load_and_validate(path)
        except PortalConfigError as exc:
            logger.error("Portal config validation failed: %s", exc)
            _cache.doc = None
            _cache.error = exc
            _cache.source = "error"
            _cache.mtime = mtime
            _cache.checked_path = path
            raise

        if _cache.source != "mounted":
            logger.info("Portal config loaded from '%s' (mounted, validated).", path)
        doc = _apply_overrides(raw_doc)
        _cache.doc = doc
        _cache.error = None
        _cache.source = "mounted"
        _cache.mtime = mtime
        _cache.checked_path = path
        return doc


def stream_portal_asset(filename: str):
    """
    GET /api/portal/assets/<filename> — instance logo/asset (see `PORTAL_ASSETS_DIR`), matching
    the existing `send_from_directory` pattern in `services/annotations.py::stream_annotation`.
    A long `max-age` is used since assets rarely change; URLs are not content-hashed (an operator
    replacing a logo in place should also change the filename, or accept a stale cache for up to
    `_PORTAL_ASSET_MAX_AGE_SECONDS`).
    """
    return send_from_directory(
        PORTAL_ASSETS_DIR,
        filename,
        conditional=True,
        max_age=_PORTAL_ASSET_MAX_AGE_SECONDS,
    )
