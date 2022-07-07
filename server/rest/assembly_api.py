from flask_restful import Resource
from flask import Response, request
import json
from db.models import Assembly
from services import assembly
from utils import common_functions

FIELDS_TO_EXCLUDE = ['id','created']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class AssemblyApi(Resource):

    def get(self):
        return Response(common_functions.query_search(Assembly,FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        track_data = request.json if request.is_json else request.form
        new_assembly = assembly.create_assembly_from_accession(accession,track_data)
        if new_assembly:
            return Response(new_assembly.to_json(), mimetype="application/json", status=201)

    def put(self,accession):
        track_data = request.json if request.is_json else request.form
        updated_assembly = assembly.update_assembly_track(accession,track_data)
        if updated_assembly:
            return Response(updated_assembly.to_json(), mimetype="application/json", status=201)

    def delete(self,accession):
        deleted_accession = assembly.delete_assembly(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
