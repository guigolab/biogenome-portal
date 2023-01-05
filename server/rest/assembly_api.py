from flask_restful import Resource
from flask import Response, request
import json
from db.models import Assembly
from services import assembly_service
from utils import common_functions
from errors import NotFound
from flask_jwt_extended import jwt_required

FIELDS_TO_EXCLUDE = ['id','created']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class AssemblyApi(Resource):

    def get(self,accession=None):
        if accession:
            assembly_obj = Assembly.objects(accession=accession).first()
            if not assembly_obj:
                raise NotFound
            if assembly_obj.chromosomes:
                assembly_obj.chromosomes = assembly_service.get_chromosomes(accession)
            return Response(assembly_obj.to_json(), mimetype="application/json", status=200)
        return Response(common_functions.query_search(Assembly,FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)
    
    @jwt_required()
    def post(self,accession):
        response = assembly_service.create_assembly_from_accession_input(accession)
        return Response(response['message'], mimetype="application/json", status=response['status'])

    @jwt_required()
    def delete(self,accession):
        deleted_accession = assembly_service.delete_assembly(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
