from flask import Response,request
from flask_restful import Resource
from services.geo_localization_service import geo_localization_coordinates, geo_localization_object, get_coordinates,get_coordinates_by_taxon,get_coordinates_by_organism,get_coordinates_by_project
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


class TaxonCoordinatesApi(Resource):
    ##get all samples with coordinates
    def get(self, taxid):
        resp = get_coordinates_by_taxon(taxid)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class ProjectCoordinatesApi(Resource):
    ##get all samples with coordinates
    def get(self, accession):
        resp = get_coordinates_by_project(accession)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class OrganismCoordinatesApi(Resource):
    ##get all samples with coordinates
    def get(self, taxid):
        resp = get_coordinates_by_organism(taxid)
        return Response(json.dumps(resp), mimetype="application/json", status=200)