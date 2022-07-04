from flask_restful import Resource
from flask import Response, request
import json
from services.assembly_service import create_or_update_assembly_from_data,query_search,delete_assembly
##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class AssemblyApi(Resource):

    def get(self):
        return Response(query_search(**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        data = request.json if request.is_json else request.form
        create_or_update_assembly_from_data(data,accession)

    # ##get last created model object
    def delete(self,accession):
        resp = delete_assembly(accession)
        return Response(json.dumps(resp), mimetype="application/json", status=200)
