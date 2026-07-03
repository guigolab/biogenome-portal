"""Publication lookup/validation API — resolves DOI / PubMed ID / PubMed Central ID via Europe PMC."""

from __future__ import annotations

import logging

import requests
from flask import request
from flask_restful import Resource

from helpers.resource_mixins import json_message, json_response
from services.publications import has_linked_assembly, resolve_publication

logger = logging.getLogger(__name__)


class PublicationLookupApi(Resource):
    """GET /api/publications/lookup?source=<src>&id=<identifier>

    Returns 200 with ``found=true`` and paper metadata when resolved, or
    ``found=false`` with an empty ``data`` object when not found.
    Non-network errors return 400; network errors return 200 with ``found=false``.
    """

    def get(self):  # noqa: D401
        source = (request.args.get("source") or "").strip()
        identifier = (request.args.get("id") or "").strip()

        if not identifier:
            return json_message("'id' query parameter is required", status=400)

        try:
            data = resolve_publication(source, identifier)
        except requests.exceptions.Timeout:
            logger.warning("Europe PMC lookup timed out for source=%s id=%s", source, identifier)
            return json_response({"found": False, "data": {}, "error": "Lookup timed out."}, status=200)
        except requests.exceptions.RequestException as exc:
            logger.warning("Europe PMC lookup failed for source=%s id=%s: %s", source, identifier, exc)
            return json_response({"found": False, "data": {}, "error": str(exc)}, status=200)

        if data is None:
            return json_response({"found": False, "data": {}}, status=200)
        return json_response({"found": True, "data": data}, status=200)


class PublicationValidateApi(Resource):
    """POST /api/publications/validate

    Body: ``{"source": "...", "id": "...", "taxid"?: "...", "field"?: "genome_publication"}``.

    Returns ``{"valid": bool, "data": {...}, "error"?: "..."}`` (200 in almost all
    cases, so the CMS form can show inline feedback while typing) so the caller can
    gate submission on ``valid``.

    When ``field == "genome_publication"``, the related organism (``taxid``) must
    have at least one linked assembly — this mirrors the server-side enforcement in
    ``services.organisms`` and keeps the CMS field locked until an assembly exists.
    """

    def post(self):
        body = request.get_json(silent=True) or {}
        source = str(body.get("source") or "").strip()
        identifier = str(body.get("id") or "").strip()
        taxid = str(body.get("taxid") or "").strip()
        field = str(body.get("field") or "").strip()

        if not identifier:
            return json_message("'id' is required", status=400)

        if field == "genome_publication":
            if not taxid:
                return json_message(
                    "'taxid' is required to validate a genome_publication", status=400
                )
            if not has_linked_assembly(taxid):
                return json_message(
                    "Cannot set a genome publication: no assembly is linked to this organism yet.",
                    status=400,
                )

        try:
            data = resolve_publication(source, identifier)
        except requests.exceptions.Timeout:
            logger.warning(
                "Europe PMC validate timed out for source=%s id=%s", source, identifier
            )
            return json_response(
                {"valid": False, "data": {}, "error": "Lookup timed out. Please try again."},
                status=200,
            )
        except requests.exceptions.RequestException as exc:
            logger.warning(
                "Europe PMC validate failed for source=%s id=%s: %s", source, identifier, exc
            )
            return json_response({"valid": False, "data": {}, "error": str(exc)}, status=200)

        if data is None:
            return json_response(
                {
                    "valid": False,
                    "data": {},
                    "error": f"'{identifier}' could not be resolved via {source or 'the selected source'}.",
                },
                status=200,
            )
        return json_response({"valid": True, "data": data}, status=200)
