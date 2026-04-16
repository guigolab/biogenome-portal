"""
Thin NCBI Entrez efetch client for BioSample records.

Uses the Entrez eutils REST API:
  efetch.fcgi?db=biosample&id=<comma-list>&retmode=xml

Rate limits (https://www.ncbi.nlm.nih.gov/books/NBK25497/):
  - Without API key: 3 requests/sec, 10 ids per request recommended.
  - With API key:   10 requests/sec, up to 200 ids per request.

Set ``NCBI_API_KEY`` and ``NCBI_EMAIL`` in the environment when running
the portal with an NCBI API key to raise the rate limit.
"""

from __future__ import annotations

import logging
import os
import time
from typing import List, Optional

import requests

logger = logging.getLogger(__name__)

_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

# Conservative defaults; adjusted when API key present.
_BATCH_SIZE_NO_KEY = 10
_BATCH_SIZE_WITH_KEY = 100
_DELAY_NO_KEY = 0.4   # ~2.5 req/sec (well under the 3/sec limit)
_DELAY_WITH_KEY = 0.12  # ~8 req/sec
_TIMEOUT = (5, 30)


def _api_key() -> Optional[str]:
    return os.getenv("NCBI_API_KEY") or None


def _email() -> Optional[str]:
    return os.getenv("NCBI_EMAIL") or None


def fetch_biosample_xml_for_accessions(accessions: List[str]) -> Optional[str]:
    """
    Fetch NCBI BioSample XML for a list of accessions via Entrez efetch.

    Returns the raw XML string on success, or ``None`` on any error.
    Batches requests according to the API-key-aware rate limits and assembles
    a single concatenated XML string with a ``<BioSampleSet>`` wrapper.
    """
    if not accessions:
        return None

    key = _api_key()
    email = _email()
    batch_size = _BATCH_SIZE_WITH_KEY if key else _BATCH_SIZE_NO_KEY
    delay = _DELAY_WITH_KEY if key else _DELAY_NO_KEY

    collected: List[str] = []

    # Unique, stable order
    unique_accessions = list(dict.fromkeys(a for a in accessions if a and str(a).strip()))

    for i in range(0, len(unique_accessions), batch_size):
        batch = unique_accessions[i : i + batch_size]
        params: dict = {
            "db": "biosample",
            "id": ",".join(batch),
            "retmode": "xml",
        }
        if key:
            params["api_key"] = key
        if email:
            params["email"] = email

        try:
            resp = requests.get(_EFETCH_URL, params=params, timeout=_TIMEOUT)
            resp.raise_for_status()
            collected.append(resp.text)
        except Exception:
            logger.exception(
                "NCBI Entrez efetch failed for BioSample batch (first accession: %s, size: %d)",
                batch[0],
                len(batch),
            )

        if i + batch_size < len(unique_accessions):
            time.sleep(delay)

    if not collected:
        return None

    # Wrap fragments in a single root element so the XML parser always sees a
    # well-formed document.  Each efetch response is already a
    # ``<BioSampleSet>...</BioSampleSet>``; strip the individual root tags and
    # reassemble under one.
    inner_parts: List[str] = []
    for fragment in collected:
        stripped = fragment.strip()
        if stripped.startswith("<?xml"):
            # Remove the XML declaration
            newline = stripped.find("\n")
            if newline != -1:
                stripped = stripped[newline + 1 :].strip()
        # Strip outer <BioSampleSet>...</BioSampleSet> wrapper
        if stripped.startswith("<BioSampleSet>") and stripped.endswith("</BioSampleSet>"):
            inner_parts.append(stripped[len("<BioSampleSet>") : -len("</BioSampleSet>")].strip())
        else:
            inner_parts.append(stripped)

    return "<?xml version=\"1.0\"?>\n<BioSampleSet>\n" + "\n".join(inner_parts) + "\n</BioSampleSet>"
