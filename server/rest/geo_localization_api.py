from flask import Response,request
from flask_restful import Resource
from services.geo_localization_service import geo_localization_coordinates, geo_localization_object
import json
from flask import current_app as app

class GeoLocApi(Resource):
    ##get all samples with coordinates
    def get(self, coordinates=None):
        if not coordinates:
            return Response(json.dumps(geo_localization_coordinates(**request.args)), mimetype="application/json", status=200)
        return Response(json.dumps(geo_localization_object(coordinates)))
    