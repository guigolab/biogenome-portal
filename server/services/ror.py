"""
ROR (Research Organization Registry) lookup / validation.

Proxies ``https://api.ror.org/v2`` so the CMS never talks to ROR directly and so
the optional ``Client-Id`` rate-limit header stays server-side.

Shared by:

- Interactive REST endpoints in :mod:`rest.ror` (search + validate).
- The OrganismPrincipal affiliations editor (admins pick institutes via typeahead
  and free-typed names are validated before being stored).

ROR client IDs are not secrets — they only raise the per-IP rate limit. Configure
via ``ROR_CLIENT_ID``.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Optional

import requests

logger = logging.getLogger(__name__)

_ROR_BASE = os.getenv("ROR_API_BASE", "https://api.ror.org/v2").rstrip("/")
_TIMEOUT = (5, 10)
_ROR_ID_RE = re.compile(
    r"^(?:https?://)?(?:ror\.org/)?(0[a-z0-9]{8})$",
    re.IGNORECASE,
)


def _client_id() -> str:
    return (os.getenv("ROR_CLIENT_ID") or "").strip()


def _headers() -> dict:
    client_id = _client_id()
    if not client_id:
        return {}
    return {"Client-Id": client_id}


def _display_name(item: dict) -> str:
    names = item.get("names") or []
    if not isinstance(names, list):
        return ""
    for entry in names:
        if not isinstance(entry, dict):
            continue
        types = entry.get("types") or []
        if "ror_display" in types:
            return str(entry.get("value") or "").strip()
    for entry in names:
        if not isinstance(entry, dict):
            continue
        types = entry.get("types") or []
        if "label" in types:
            return str(entry.get("value") or "").strip()
    for entry in names:
        if isinstance(entry, dict) and entry.get("value"):
            return str(entry["value"]).strip()
    return ""


def _country(item: dict) -> Optional[str]:
    locations = item.get("locations") or []
    if not isinstance(locations, list) or not locations:
        return None
    first = locations[0]
    if not isinstance(first, dict):
        return None
    details = first.get("geonames_details") or {}
    if not isinstance(details, dict):
        return None
    name = details.get("country_name")
    return str(name).strip() if name else None


def normalize(item: dict) -> dict:
    """Slim ROR record shape for CMS consumers."""
    ror_id = str(item.get("id") or "").strip()
    types = item.get("types") or []
    if not isinstance(types, list):
        types = []
    return {
        "ror_id": ror_id,
        "name": _display_name(item),
        "country": _country(item),
        "types": [str(t) for t in types if t is not None],
        "status": str(item.get("status") or "").strip() or None,
    }


def _extract_ror_id(value: str) -> Optional[str]:
    match = _ROR_ID_RE.match((value or "").strip())
    if not match:
        return None
    return match.group(1).lower()


def search_organizations(query: str, limit: int = 10) -> list[dict]:
    """
    Keyword search against ROR ``/organizations?query=...``.

    Raises ``requests.exceptions.RequestException`` on network errors so callers
    can decide how to degrade.
    """
    text = (query or "").strip()
    if not text:
        return []
    limit = max(1, min(int(limit) if limit is not None else 10, 20))
    resp = requests.get(
        f"{_ROR_BASE}/organizations",
        params={"query": text},
        headers=_headers(),
        timeout=_TIMEOUT,
    )
    resp.raise_for_status()
    payload = resp.json() if resp.content else {}
    items = payload.get("items") if isinstance(payload, dict) else None
    if not isinstance(items, list):
        return []
    out: list[dict] = []
    for raw in items:
        if not isinstance(raw, dict):
            continue
        normalized = normalize(raw)
        if not normalized.get("name"):
            continue
        out.append(normalized)
        if len(out) >= limit:
            break
    return out


def _get_by_id(ror_id: str) -> Optional[dict]:
    """Fetch a single ROR record; ``404`` → ``None``."""
    rid = (ror_id or "").strip().lower()
    if not rid:
        return None
    resp = requests.get(
        f"{_ROR_BASE}/organizations/{rid}",
        headers=_headers(),
        timeout=_TIMEOUT,
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    payload = resp.json() if resp.content else None
    if not isinstance(payload, dict):
        return None
    normalized = normalize(payload)
    return normalized if normalized.get("name") else None


def resolve_organization(value: str) -> Optional[dict]:
    """
    Validate a free-typed institute name or ROR ID against the registry.

    - ROR ID shape → single-record lookup.
    - Otherwise → search and require an exact case-insensitive name match among
      the top hits.

    Returns the normalized organization dict, or ``None`` when not found.
    Raises ``requests.exceptions.RequestException`` on network errors.
    """
    text = (value or "").strip()
    if not text:
        return None

    ror_id = _extract_ror_id(text)
    if ror_id:
        return _get_by_id(ror_id)

    hits = search_organizations(text, limit=5)
    needle = text.casefold()
    for hit in hits:
        name = str(hit.get("name") or "").strip()
        if name.casefold() == needle:
            return hit
    return None
