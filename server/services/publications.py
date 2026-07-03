"""
Publication lookup / validation — resolves DOI, PubMed ID, and PubMed Central ID
(see :class:`~db.enums.PublicationSource`) via the Europe PMC search API.

Shared by:

- The interactive REST endpoints in :mod:`rest.publications` (lookup + validate).
- Organism create/update/patch enforcement in :mod:`services.organisms` (invalid or
  unresolvable publications block the save).
- The one-off ``genome_publication`` backfill job
  (:mod:`jobs.support.genome_publication_backfill`).

Rate limiting: Europe PMC's fair-use guidance asks clients to keep request rates
modest. Every outbound call funnels through :func:`_throttle` (minimum spacing +
jitter) and honors HTTP 429 ``Retry-After`` (capped), mirroring the pacing pattern in
``jobs/support/iucn_redlist_fetch.py``. This keeps both interactive form validation and
bulk backfill runs within reasonable limits.
"""

from __future__ import annotations

import email.utils
import logging
import os
import random
import threading
import time
from datetime import datetime, timezone
from typing import Optional

import requests
from werkzeug.exceptions import BadRequest

from db.model import Organism

logger = logging.getLogger(__name__)

_EUROPEPMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
_TIMEOUT = (5, 10)

# Conservative pacing (overridable via env) — keeps interactive validation and the
# bulk backfill job on the same throttled path.
_BASE_THROTTLE = float(os.getenv("EUROPEPMC_HTTP_THROTTLE", "0.35"))
_THROTTLE_JITTER = float(os.getenv("EUROPEPMC_HTTP_THROTTLE_JITTER_SEC", "0.15"))
_429_RETRY_MAX_WAIT = float(os.getenv("EUROPEPMC_429_MAX_WAIT_SEC", "60"))

_throttle_lock = threading.Lock()
_last_call_at = 0.0


def _throttle() -> None:
    """Block to keep a minimum spacing between outbound Europe PMC calls (+jitter)."""
    global _last_call_at
    base = max(0.0, _BASE_THROTTLE)
    jitter = max(0.0, _THROTTLE_JITTER)
    min_interval = base + (random.uniform(0.0, jitter) if jitter else 0.0)
    with _throttle_lock:
        elapsed = time.monotonic() - _last_call_at
        remaining = min_interval - elapsed
        if remaining > 0:
            time.sleep(remaining)
        _last_call_at = time.monotonic()


def _retry_after_seconds(response: requests.Response) -> Optional[float]:
    raw = response.headers.get("Retry-After")
    if not raw:
        return None
    raw = raw.strip()
    if raw.isdigit():
        return float(raw)
    try:
        dt = email.utils.parsedate_to_datetime(raw)
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return max(0.0, (dt - datetime.now(timezone.utc)).total_seconds())
    except (TypeError, ValueError, OSError):
        return None


def query_for(source: str, identifier: str) -> Optional[str]:
    """Build an Europe PMC search query string from a source/identifier pair."""
    src = (source or "").strip()
    ident = (identifier or "").strip()
    if not ident:
        return None
    if src == "DOI":
        return f'DOI:"{ident}"'
    if src == "PubMed ID":
        return f"EXT_ID:{ident} AND SRC:MED"
    if src in ("PubMed CentralID", "PMC"):
        pmcid = ident if ident.upper().startswith("PMC") else f"PMC{ident}"
        return f"PMCID:{pmcid}"
    # generic fallback: treat as DOI
    return f'DOI:"{ident}"'


def _normalise_hit(hit: dict) -> dict:
    return {
        "title": hit.get("title", ""),
        "authors": hit.get("authorString", ""),
        "journal": hit.get("journalTitle", ""),
        "year": hit.get("pubYear", ""),
        "doi": hit.get("doi", ""),
        "pmid": hit.get("id") if hit.get("source") == "MED" else hit.get("pmid", ""),
        "pmcid": hit.get("pmcid", ""),
        "abstract": hit.get("abstractText", ""),
    }


def _search(query: str) -> requests.Response:
    _throttle()
    return requests.get(
        _EUROPEPMC_SEARCH,
        params={"query": query, "format": "json", "resultType": "lite", "pageSize": 1},
        timeout=_TIMEOUT,
    )


def resolve_publication(source: str, identifier: str) -> Optional[dict]:
    """
    Query Europe PMC for a DOI / PubMed ID / PubMed Central ID.

    Returns the normalized hit dict when found, or ``None`` when not found (or no
    query could be built for the given source/id). Raises
    ``requests.exceptions.RequestException`` (including ``Timeout``) on network
    errors — callers decide how to treat "could not validate".
    """
    query = query_for(source, identifier)
    if query is None:
        return None

    resp = _search(query)
    if resp.status_code == 429:
        wait = _retry_after_seconds(resp)
        if wait is None:
            wait = 15.0
        wait = min(max(wait, 1.0), _429_RETRY_MAX_WAIT)
        logger.warning(
            "Europe PMC rate limited (429) for query=%r; waiting %.1fs then retrying once",
            query,
            wait,
        )
        time.sleep(wait)
        resp = _search(query)

    resp.raise_for_status()
    data = resp.json()
    hits = data.get("resultList", {}).get("result", [])
    if not hits:
        return None
    return _normalise_hit(hits[0])


def validate_publication_or_raise(
    source: str, identifier: str, *, context: str = "publication"
) -> dict:
    """
    Resolve a publication and raise ``BadRequest`` when it cannot be validated.

    Used on Organism create/update/patch paths where an invalid or unresolvable
    publication must block the save (network errors are treated as "could not
    validate" and also block, since we cannot confirm validity).
    """
    ident = (identifier or "").strip()
    if not ident:
        raise BadRequest(description=f"'{context}.id' is required")
    try:
        data = resolve_publication(source, ident)
    except requests.exceptions.Timeout as exc:
        raise BadRequest(
            description=f"Could not validate {context} '{ident}': lookup timed out. Please try again."
        ) from exc
    except requests.exceptions.RequestException as exc:
        raise BadRequest(
            description=f"Could not validate {context} '{ident}': {exc}"
        ) from exc
    if data is None:
        raise BadRequest(
            description=(
                f"{context} '{ident}' ({source or 'unknown source'}) could not be resolved "
                "against any supported source (DOI, PubMed, PubMed Central)."
            )
        )
    return data


def has_linked_assembly(taxid: str) -> bool:
    """True when the organism has at least one linked assembly (denormalized counter)."""
    organism = Organism.objects(taxid=str(taxid)).only("assemblies_count").first()
    if organism is None:
        return False
    return int(organism.assemblies_count or 0) > 0
