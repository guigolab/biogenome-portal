"""Publication lookup API — resolves DOI / PubMed ID / PubMed Central ID via Europe PMC."""

from __future__ import annotations

import logging

import requests
from flask import request
from flask_restful import Resource

from helpers.resource_mixins import json_message, json_response

logger = logging.getLogger(__name__)

_EUROPEPMC_SEARCH = "https://www.ebi.ac.uk/europepmc/webservices/rest/search"
_TIMEOUT = (5, 10)


def _query_for(source: str, identifier: str) -> str | None:
    """Build an Europe PMC search query string from source/identifier pair."""
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


class PublicationLookupApi(Resource):
    """GET /api/publications/lookup?source=<src>&id=<identifier>

    Returns 200 with ``found=true`` and paper metadata when resolved, or
    ``found=false`` with an empty ``data`` object when not found.
    Non-network errors return 400; network errors return 502.
    """

    def get(self):  # noqa: D401
        source = (request.args.get("source") or "").strip()
        identifier = (request.args.get("id") or "").strip()

        if not identifier:
            return json_message("'id' query parameter is required", status=400)

        query = _query_for(source, identifier)
        if query is None:
            return json_message("Could not build a search query for the given source/id combination.", status=400)

        try:
            resp = requests.get(
                _EUROPEPMC_SEARCH,
                params={"query": query, "format": "json", "resultType": "lite", "pageSize": 1},
                timeout=_TIMEOUT,
            )
            resp.raise_for_status()
            data = resp.json()
        except requests.exceptions.Timeout:
            logger.warning("Europe PMC lookup timed out for query: %s", query)
            return json_response({"found": False, "data": {}, "error": "Lookup timed out."}, status=200)
        except requests.exceptions.RequestException as exc:
            logger.warning("Europe PMC lookup failed for query %s: %s", query, exc)
            return json_response({"found": False, "data": {}, "error": str(exc)}, status=200)

        hits = data.get("resultList", {}).get("result", [])
        if not hits:
            return json_response({"found": False, "data": {}}, status=200)

        return json_response({"found": True, "data": _normalise_hit(hits[0])}, status=200)
