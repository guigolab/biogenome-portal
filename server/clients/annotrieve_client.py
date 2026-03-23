"""HTTP client for Annotrieve (CRG) genome annotation API."""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

ANNOTRIEVE_ANNOTATIONS_URL = os.getenv(
    "ANNOTRIEVE_ANNOTATIONS_URL",
    "https://genome.crg.es/annotrieve/api/v0/annotations",
)
ANNOTRIEVE_FILES_BASE = os.getenv(
    "ANNOTRIEVE_FILES_BASE",
    "https://genome.crg.es/annotrieve/files",
)

# API result page size (Annotrieve cap).
PAGE_LIMIT = 1000
_HTTP_TIMEOUT = (30, 180)
_MAX_RETRIES = 3


def file_url(relative_path: Optional[str]) -> Optional[str]:
    """Turn ``indexed_file_info`` path into a downloadable URL under ``ANNOTRIEVE_FILES_BASE``."""
    if not relative_path or not str(relative_path).strip():
        return None
    base = ANNOTRIEVE_FILES_BASE.rstrip("/")
    p = str(relative_path).strip()
    if not p.startswith("/"):
        p = f"/{p}"
    return f"{base}{p}"


def post_annotations_page(
    session: requests.Session,
    assembly_accessions: List[str],
    offset: int,
    *,
    limit: int = PAGE_LIMIT,
) -> Dict[str, Any]:
    """
    POST /annotations with ``assembly_accessions``, ``limit``, ``offset``.

    Retries on network / HTTP errors with exponential backoff.
    """
    payload = {
        "assembly_accessions": assembly_accessions,
        "limit": limit,
        "offset": offset,
    }
    last_exc: Optional[Exception] = None
    for attempt in range(_MAX_RETRIES):
        try:
            resp = session.post(
                ANNOTRIEVE_ANNOTATIONS_URL,
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=_HTTP_TIMEOUT,
            )
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, ValueError) as exc:
            last_exc = exc
            wait = 2**attempt
            logger.warning(
                "Annotrieve POST failed (attempt %s/%s, offset=%s): %s; retry in %ss",
                attempt + 1,
                _MAX_RETRIES,
                offset,
                exc,
                wait,
            )
            time.sleep(wait)
    assert last_exc is not None
    raise last_exc


def fetch_annotations_for_assembly_accessions(
    session: requests.Session,
    assembly_accessions: List[str],
) -> List[Dict[str, Any]]:
    """
    All annotation objects for the given accessions, following pagination until complete.
    """
    if not assembly_accessions:
        return []
    out: List[Dict[str, Any]] = []
    offset = 0
    while True:
        data = post_annotations_page(session, assembly_accessions, offset)
        total = int(data.get("total") or 0)
        results = data.get("results") or []
        if not isinstance(results, list):
            logger.error("Annotrieve unexpected results type: %s", type(results))
            break
        out.extend(r for r in results if isinstance(r, dict))
        offset += len(results)
        if offset >= total or not results:
            break
    return out
