from flask_restful import Resource
from flask import Response, request
from services import assemblies
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from db.model import Assembly
from helpers.resource_mixins import (
    document_json_response,
    json_message,
    json_response,
    read_payload,
)
from helpers.service_utils import get_or_404


class AssembliesImportApi(Resource):
    #import assemblies from a list of accessions
    @admin_required()
    @jwt_required()
    def post(self):
        data = read_payload(request)
        resp = assemblies.trigger_accessions_job(data)
        return json_response(resp, status=200)

class AssemblyApi(Resource):
    def get(self,accession):
        assembly_obj = get_or_404(Assembly, f"Assembly {accession} not found", accession=accession)
        return document_json_response(assembly_obj)
    
    @admin_required()
    @jwt_required()
    def post(self, accession):
        message = assemblies.create_assembly_from_accession(accession)
        return json_message("Assembly created", status=201, accession=message)
    
    @admin_required()
    @jwt_required()
    def delete(self,accession):
        deleted_accession = assemblies.delete_assembly(accession)
        return json_message("Assembly deleted", status=201, accession=deleted_accession)

class AssembliesFromAnnotations(Resource):
    def get(self):
        resp, mimetype = assemblies.get_assemblies_from_annotations(request.args)
        return Response(resp, mimetype=mimetype, status=200)

class AssemblyRelatedAnnotationsApi(Resource):
    def get(self, accession):
        response, mimetype = assemblies.get_related_annotations(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)

class AssemblyChrAliasesApi(Resource):
    def get(self,accession):
        return assemblies.get_chr_aliases_file(accession)
    
class AssembliesRelatedChromosomesApi(Resource):
    def get(self,accession):
        response, mimetype = assemblies.get_related_chromosomes(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)
