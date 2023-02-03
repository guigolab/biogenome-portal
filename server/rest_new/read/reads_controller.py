from flask_restful import Resource
from flask import Response, request
import json
from db.models import Experiment
from . import reads_service
from utils import common_functions
from errors import NotFound
from flask_jwt_extended import jwt_required


FIELDS_TO_EXCLUDE = ['id','created']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class ExperimentsApi(Resource):

    def get(self):
        total,data = reads_service.get_reads(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class ExperimentApi(Resource):

    def get(self,accession=None):
        if accession:
            experiment_obj = Experiment.objects(experiment_accession=accession).first()
            if not experiment_obj:
                raise NotFound
            return Response(experiment_obj.to_json(), mimetype="application/json", status=200)
        return Response(common_functions.query_search(Experiment,FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)

    @jwt_required()
    def post(self,accession):
        response = reads_service.create_read_from_experiment_accession(accession)
        return Response(json.dumps(response['message']), mimetype="application/json", status=response['status'])

    @jwt_required()
    def delete(self,accession):
        deleted_accession = reads_service.delete_experiment(accession)
        return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
