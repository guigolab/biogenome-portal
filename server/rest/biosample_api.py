from flask_restful import Resource
from flask import Response, request
import json
from db.models import BioSample
from services import biosample
from utils import common_functions

FIELDS_TO_EXCLUDE = ['id','created','last_check']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class BioSampleApi(Resource):

    def get(self):
        return Response(common_functions.query_search(BioSample,FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        response = biosample.create_biosample_from_accession_input(accession)
        return Response(json.dumps(response), mimetype="application/json", status=201)

    def delete(self,accession):
        deleted_accession = biosample.delete_biosample(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
