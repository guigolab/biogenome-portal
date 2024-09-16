from flask import Response,request
from flask_restful import Resource
from . import sample_locations_service
import json


class SampleLocations(Resource):
    def get(self):
        resp = sample_locations_service.get_sample_locations(**request.args)
        return Response(json.dumps(resp), mimetype="application/json", status=200)
