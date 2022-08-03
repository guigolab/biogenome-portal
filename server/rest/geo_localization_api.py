from flask import Response,request
from flask_restful import Resource
from services.geo_localization_service import geo_localization_coordinates, geo_localization_object, get_coordinates
import json
from flask import current_app as app

class GeoLocApi(Resource):
    ##get all samples with coordinates
    def get(self, coordinates=None):
        if not coordinates:
            app.logger.info(request.args)
            return Response(json.dumps(geo_localization_coordinates(**request.args)), mimetype="application/json", status=200)
        return Response(json.dumps(geo_localization_object(coordinates)))
    
    def post(self):
        data = request.json if request.is_json else request.form
        app.logger.info(data)
        result = get_coordinates(data)
        return Response(json.dumps(result), mimetype="application/json", status=200)

