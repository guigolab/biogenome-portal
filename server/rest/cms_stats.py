import json

from flask import Response
from flask_jwt_extended import get_jwt, jwt_required
from flask_restful import Resource
from werkzeug.exceptions import Forbidden

from services import cms_stats
from wrappers.admin import admin_required


class CmsAdminOverviewStatsApi(Resource):
    @jwt_required()
    @admin_required()
    def get(self):
        claims = get_jwt()
        username = claims.get("username") or ""
        payload = cms_stats.get_admin_overview(username)
        return Response(json.dumps(payload), mimetype="application/json", status=200)


class CmsDataManagerOverviewStatsApi(Resource):
    @jwt_required()
    def get(self):
        claims = get_jwt()
        username = claims.get("username")
        if not username:
            return Response(
                json.dumps({"message": "Not authenticated."}),
                mimetype="application/json",
                status=401,
            )
        try:
            payload = cms_stats.get_data_manager_overview(username)
        except PermissionError as e:
            raise Forbidden(description=str(e)) from e
        return Response(json.dumps(payload), mimetype="application/json", status=200)
