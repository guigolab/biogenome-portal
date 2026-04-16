from flask import Response, request
from flask_restful import Resource
from helpers.cache_key import cached_endpoint
from helpers.resource_mixins import json_message, read_payload
from services import stats

_CACHE_TTL = 900


class FieldStatsByModelApi(Resource):
    """
    POST /api/stats/<model> — JSON body ``{"field": "<dot.path>"}``.
    Same query string behavior as GET /api/stats/<model>/<field> (e.g. taxon_lineage),
    but avoids ``/`` and other special characters in the URL path.
    """

    @cached_endpoint(timeout=_CACHE_TTL)
    def post(self, model):
        data = read_payload() or {}
        field = data.get("field") if isinstance(data, dict) else None
        if not field or not isinstance(field, str) or not field.strip():
            return json_message("field is required (string)", status=400)
        mode = (data.get("mode") if isinstance(data, dict) else None) or "facet"
        if mode == "date_histogram":
            json_resp, status = stats.get_date_histogram_buckets(
                model, field.strip(), request.args
            )
        else:
            json_resp, status = stats.get_stats(model, field.strip(), request.args)
        return Response(json_resp, mimetype="application/json", status=status)


class FieldStatsApi(Resource):
    @cached_endpoint(timeout=_CACHE_TTL)
    def get(self, model, field):
        json_resp, status = stats.get_stats(model, field, request.args)
        return Response(json_resp, mimetype="application/json", status=status)
