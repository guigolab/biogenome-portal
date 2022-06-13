from flask import Response
from db.models import GeoCoordinates
from flask_restful import Resource
# from errors import NotFound,SchemaValidationError,RecordAlreadyExistError,TaxonNotFoundError
# from utils.utils import parse_sample_metadata
# from utils import ena_client
# from datetime import datetime
from services.geo_localization_service import geo_localization_coordinates
# import services.submission_service as service
# from flask_jwt_extended import jwt_required
# from flask_jwt_extended import get_jwt_identity
# from mongoengine.queryset.visitor import Q
# from utils.pipelines import SamplePipeline,SamplePipelinePrivate
import json
from flask import current_app as app

class GeoLocApi(Resource):
    ##get all samples with coordinates
    def get(self):
        # bioproject = request.args['bioproject'] if 'bioproject' in request.args.keys() else None
        return Response(json.dumps(geo_localization_coordinates()), mimetype="application/json", status=200)
    
    # ##post request to handle large collection of geo_loc ids (format: lat,loc string)
    # def post(self):
    #     if request.is_json and 'ids' in request.json.keys(): 
    #         ids = request.json['ids']
    #     elif request.form and 'ids' in request.form.keys():
    #         ids = request.form
    #     else:
    #         raise SchemaValidationError
    #     return Response(json.dumps(geo_localization_service.get_geoloc_by_ids(ids)), mimetype="application/json", status=200)
