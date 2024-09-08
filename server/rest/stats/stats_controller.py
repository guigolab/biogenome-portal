from flask import Response,request
from flask_restful import Resource
import json
from . import stats_service


class FieldStatsApi(Resource):
    def get(self, model, field):
        resp,status = stats_service.get_stats(model, field, request.args)
        return Response(json.dumps(resp, default=str),mimetype="application/json", status=status)

