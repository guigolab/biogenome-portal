from flask_restful import Resource
from flask import Response, request
import json
from db.models import BioSample
from services import biosample_service
from utils import common_functions
from errors import NotFound

FIELDS_TO_EXCLUDE = ['id','created','last_check']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class BioSampleApi(Resource):

    def get(self,accession=None):
        if accession:
            biosample_obj=BioSample.objects(accession=accession).first()
            if not biosample_obj:
                raise NotFound
            return Response(biosample_obj.to_json(),mimetype="application/json", status=200)
        return Response(common_functions.query_search(BioSample,FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        response = biosample_service.create_biosample_from_accession_input(accession)
        return Response(json.dumps(response['message']), mimetype="application/json", status=response['status'])

    def delete(self,accession):
        deleted_accession = biosample_service.delete_biosample(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
