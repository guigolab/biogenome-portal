from flask_restful import Resource
from flask import Response, request
import json
from services import assembly_service
##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class AssemblyApi(Resource):

    def get(self):
        return Response(assembly_service.get_assemblies(**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        track_data = request.json if request.is_json else request.form
        new_assembly = assembly_service.create_assembly_from_accession(accession,track_data)
        if new_assembly:
            return Response(new_assembly.to_json(), mimetype="application/json", status=201)

    def put(self,accession):
        track_data = request.json if request.is_json else request.form
        updated_assembly = assembly_service.update_assembly_track(accession,track_data)
        if updated_assembly:
            return Response(updated_assembly.to_json(), mimetype="application/json", status=201)

    def delete(self,accession):
        deleted_accession = assembly_service.delete_assembly(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)