from flask_restful import Resource
from flask import Response, request
from services.assembly_service import create_or_update_assembly_from_data,query_search
##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class AnnotationApi(Resource):

    def get(self):
        return Response(query_search(**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        data = request.json if request.is_json else request.form
        create_or_update_assembly_from_data(data,accession)

    def delete(name):
        
    # ##get last created model object

