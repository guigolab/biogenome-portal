from flask_restful import Resource
from flask import Response, request
import json
from db.models import Experiment
from services import reads
from utils import common_functions

FIELDS_TO_EXCLUDE = ['id','created']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class ExperimentApi(Resource):

    def get(self):
        return Response(common_functions.query_search(Experiment,FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        response = reads.create_read_from_experiment_accession(accession)
        return Response(json.dumps(response), mimetype="application/json", status=201)

    def delete(self,accession):
        deleted_accession = reads.delete_experiment(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
