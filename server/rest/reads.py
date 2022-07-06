from flask_restful import Resource
from flask import Response, request
import json
from services import experiment_service
##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class ExperimentyApi(Resource):

    def get(self):
        return Response(experiment_service.get_experiments(**request.args), mimetype="application/json", status=200)


    def post(self,accession):
        track_data = request.json if request.is_json else request.form
        new_assembly = assembly_service.create_assembly_from_accession(accession,track_data)
        if new_assembly:
            return Response(new_assembly.to_json(), mimetype="application/json", status=201)

    def delete(self,accession):
        deleted_accession = experiment_service.delete_experiment(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
