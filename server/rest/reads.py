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
        track_data = request.json if request.is_json else request.form
        saved_reads = reads.create_reads_from_accession(accession)
        if saved_reads:
            return Response(saved_reads.to_json(), mimetype="application/json", status=201)

    def delete(self,accession):
        deleted_accession = reads.delete_experiment(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
