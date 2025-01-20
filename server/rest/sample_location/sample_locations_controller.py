from flask import Response,request
from flask_restful import Resource
from . import sample_locations_service
import json


class SampleLocations(Resource):
    def get(self):
        resp = sample_locations_service.get_sample_locations(**request.args)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class UniqueLocations(Resource):
    def get(self):
        resp = sample_locations_service.get_unique_sample_locations(**request.args)
        return Response(json.dumps(resp), mimetype="application/json", status=200)


class LocationFromCoords(Resource):
    def get(self, coordinates):
        resp = sample_locations_service.get_locations_from_coordinates(coordinates)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

