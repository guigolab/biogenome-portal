"""ROR institute search / validation API — proxies Research Organization Registry."""

from __future__ import annotations

import logging

import requests
from flask import request
from flask_jwt_extended import jwt_required
from flask_restful import Resource

from helpers.resource_mixins import json_message, json_response
from services import ror

logger = logging.getLogger(__name__)


class RorSearchApi(Resource):
    """GET /api/ror/search?query=<text>&limit=<n>

    Auth required. Returns ``{"items": [...]}``; network errors degrade to an
    empty list with ``error`` so typeahead UIs do not hard-fail.
    """

    @jwt_required()
    def get(self):
        query = (request.args.get("query") or "").strip()
        if not query:
            return json_message("'query' query parameter is required", status=400)

        limit_raw = request.args.get("limit", "10")
        try:
            limit = int(limit_raw)
        except (TypeError, ValueError):
            return json_message("'limit' must be an integer", status=400)

        try:
            items = ror.search_organizations(query, limit=limit)
        except requests.exceptions.Timeout:
            logger.warning("ROR search timed out for query=%r", query)
            return json_response(
                {"items": [], "error": "Institute search timed out. Please try again."},
                status=200,
            )
        except requests.exceptions.RequestException as exc:
            logger.warning("ROR search failed for query=%r: %s", query, exc)
            return json_response({"items": [], "error": str(exc)}, status=200)

        return json_response({"items": items}, status=200)


class RorValidateApi(Resource):
    """POST /api/ror/validate

    Body: ``{"value": "<institute name or ROR ID>"}``.

    Auth required. Returns ``{"valid": bool, "data": {...}, "error"?: "..."}``
    (200 in almost all cases) so the CMS form can show inline feedback.
    """

    @jwt_required()
    def post(self):
        body = request.get_json(silent=True) or {}
        value = str(body.get("value") or "").strip()
        if not value:
            return json_message("'value' is required", status=400)

        try:
            data = ror.resolve_organization(value)
        except requests.exceptions.Timeout:
            logger.warning("ROR validate timed out for value=%r", value)
            return json_response(
                {
                    "valid": False,
                    "data": {},
                    "error": "Institute lookup timed out. Please try again.",
                },
                status=200,
            )
        except requests.exceptions.RequestException as exc:
            logger.warning("ROR validate failed for value=%r: %s", value, exc)
            return json_response(
                {"valid": False, "data": {}, "error": str(exc)},
                status=200,
            )

        if data is None:
            return json_response(
                {
                    "valid": False,
                    "data": {},
                    "error": (
                        f"'{value}' was not found in ROR. "
                        "Search and select an institute from the suggestions, "
                        "or enter a valid ROR ID."
                    ),
                },
                status=200,
            )
        return json_response({"valid": True, "data": data}, status=200)
