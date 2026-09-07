"""
Public, unauthenticated portal configuration endpoints (front-config-centralization-plan.md,
Phase 4). No `@jwt_required()` on either resource: the front-end needs this before any user is
authenticated (nav branding, CMS gate, login page copy).
"""

import hashlib
import json

from flask import Response, request
from flask_restful import Resource

from services import portal_config


def _etag_for(body: str) -> str:
    return f'"{hashlib.sha256(body.encode("utf-8")).hexdigest()}"'


def _if_none_match_hits(if_none_match: str, etag: str) -> bool:
    parts = [p.strip() for p in if_none_match.split(",")]
    return "*" in parts or etag in parts


class PortalConfigApi(Resource):
    """GET /api/portal — backend-authoritative, validated, derived portal config (see
    `services/portal_config.py`). Public: no JWT required."""

    def get(self):
        doc = portal_config.get_portal_config()
        body = json.dumps(doc, sort_keys=True)
        etag = _etag_for(body)
        headers = {
            "Cache-Control": "public, max-age=30",
            "ETag": etag,
        }
        if_none_match = request.headers.get("If-None-Match")
        if if_none_match and _if_none_match_hits(if_none_match, etag):
            return Response(status=304, headers=headers)
        return Response(body, mimetype="application/json", status=200, headers=headers)


class PortalAssetApi(Resource):
    """GET /api/portal/assets/<filename> — instance logo/asset from `PORTAL_ASSETS_DIR` (see
    `services/portal_config.py::stream_portal_asset`). Public: no JWT required."""

    def get(self, filename):
        return portal_config.stream_portal_asset(filename)
