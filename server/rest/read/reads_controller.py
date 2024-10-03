from flask_restful import Resource
from flask import Response, request
import json
from . import reads_service
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required

class ExperimentsApi(Resource):
    def get(self):
        response, mimetype, status = reads_service.get_reads(request.args)
        return Response(response, mimetype=mimetype, status=status)

class ExperimentApi(Resource):

    def get(self,accession=None):
        experiment_obj = reads_service.get_experiment(accession)
        return Response(experiment_obj.to_json(), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self,accession):
        message = reads_service.create_experiment_from_accession(accession)
        return Response(json.dumps(message), mimetype="application/json", status=201)
   

    @jwt_required()
    @admin_required()
    def delete(self,accession):
        deleted_accession = reads_service.delete_experiment(accession)
        return Response(json.dumps(deleted_accession), mimetype="application/json", status=200)

class ReadsByExperiment(Resource):
    def get(self, accession):
        reads = reads_service.get_reads_by_experiment(accession)
        return Response(reads.to_json(), mimetype="application/json", status=200)
