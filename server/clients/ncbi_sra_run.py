"""
NCBI Entrez client for SRA run metadata (BioSample, taxon) by run accession.

Uses esearch (db=sra) + efetch (rettype=runinfo) to match the requested ``Run``
when Entrez returns a record that expands to multiple runs.
"""

from __future__ import annotations

import csv
import io
import logging
import os
import time
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"
_TIMEOUT = (5, 30)
_DELAY_NO_KEY = 0.4
_DELAY_WITH_KEY = 0.12


def _api_key() -> Optional[str]:
    return os.getenv("NCBI_API_KEY") or None


def _email() -> Optional[str]:
    return os.getenv("NCBI_EMAIL") or None


def _entrez_params_base() -> Dict[str, Any]:
    params: Dict[str, Any] = {}
    key = _api_key()
    if key:
        params["api_key"] = key
    email = _email()
    if email:
        params["email"] = email
    return params


def _esearch_sra_uids(run_accession: str) -> List[str]:
    params = {
        "db": "sra",
        "term": f"{run_accession}[accn]",
        "retmode": "json",
        "retmax": 20,
        **_entrez_params_base(),
    }
    try:
        resp = requests.get(_ESEARCH_URL, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        logger.exception("NCBI esearch failed for SRA run %s", run_accession)
        return []
    idlist = data.get("esearchresult", {}).get("idlist") or []
    return [str(x) for x in idlist]


def _column_name(fieldnames: Optional[List[str]], logical: str) -> Optional[str]:
    if not fieldnames:
        return None
    logical_lower = logical.lower()
    for h in fieldnames:
        if h is None:
            continue
        if h.strip().lstrip("\ufeff").lower() == logical_lower:
            return h
    return None


def _parse_runinfo_for_run(text: str, run_accession: str) -> Optional[Dict[str, str]]:
    if not text or not text.strip():
        return None
    run_accession = str(run_accession).strip()
    try:
        reader = csv.DictReader(io.StringIO(text.strip()))
    except Exception:
        return None
    fn = reader.fieldnames
    if not fn:
        return None
    run_col = _column_name(list(fn), "run")
    bio_col = _column_name(list(fn), "biosample")
    if not run_col or not bio_col:
        return None
    tax_col = _column_name(list(fn), "taxid")
    name_col = _column_name(list(fn), "scientificname")

    for row in reader:
        run_val = (row.get(run_col) or "").strip()
        if run_val != run_accession:
            continue
        biosample = (row.get(bio_col) or "").strip()
        if not biosample:
            return None
        out: Dict[str, str] = {"sample_accession": biosample}
        if tax_col:
            tid = (row.get(tax_col) or "").strip()
            if tid:
                out["tax_id"] = tid
        if name_col:
            sn = (row.get(name_col) or "").strip()
            if sn:
                out["scientific_name"] = sn
        return out
    return None


def _efetch_runinfo(uid: str) -> Optional[str]:
    params = {
        "db": "sra",
        "id": uid,
        "rettype": "runinfo",
        "retmode": "text",
        **_entrez_params_base(),
    }
    try:
        resp = requests.get(_EFETCH_URL, params=params, timeout=_TIMEOUT)
        resp.raise_for_status()
        return resp.text
    except Exception:
        logger.exception("NCBI efetch runinfo failed for SRA uid %s", uid)
        return None


def fetch_sra_run_metadata_by_run_accession(run_accession: str) -> Optional[Dict[str, str]]:
    """
    Resolve BioSample accession (and optional TaxID / ScientificName) for an INSDC run
    accession (e.g. SRR, ERR, DRR) via NCBI Entrez.

    Returns a dict with keys ``sample_accession`` (required), optional ``tax_id`` and
    ``scientific_name``, or ``None`` if lookup fails.
    """
    acc = (run_accession or "").strip()
    if not acc:
        return None

    uids = _esearch_sra_uids(acc)
    if not uids:
        return None

    delay = _DELAY_WITH_KEY if _api_key() else _DELAY_NO_KEY
    time.sleep(delay)

    for i, uid in enumerate(uids):
        if i:
            time.sleep(delay)
        text = _efetch_runinfo(uid)
        if not text:
            continue
        parsed = _parse_runinfo_for_run(text, acc)
        if parsed:
            return parsed
    return None
