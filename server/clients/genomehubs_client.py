import logging
from typing import Any, List, Optional

import requests

logger = logging.getLogger(__name__)

BLOBTOOLKIT_API = "https://blobtoolkit.genomehubs.org/api/v1/search/autocomplete"
_REQUEST_TIMEOUT = 30


def get_blobtoolkit_id(accession: str) -> List[Any]:
    """
    Raw JSON body from the autocomplete API (list of hit dicts).

    Returns an empty list on network/parse errors so callers can use ``len(...)`` safely.
    """
    if not accession or not str(accession).strip():
        return []
    url = f"{BLOBTOOLKIT_API}/{str(accession).strip()}"
    try:
        resp = requests.get(url, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []
    except Exception:
        logger.warning(
            "BlobToolKit autocomplete failed for accession %r",
            accession,
            exc_info=True,
        )
        return []


def fetch_blobtoolkit_first_name(accession: str) -> Optional[str]:
    """First ``names[0]`` from the first autocomplete hit, or ``None``."""
    hits = get_blobtoolkit_id(accession)
    if not hits:
        return None
    first = hits[0]
    if not isinstance(first, dict):
        return None
    names = first.get("names")
    if isinstance(names, list) and names and names[0]:
        return str(names[0]).strip() or None
    return None
