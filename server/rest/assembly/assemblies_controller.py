from flask_restful import Resource
from flask import Response, request
import json
from . import assemblies_service
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from helpers import data as data_helper

class AssembliesApi(Resource):
    def get(self):
        resp, mimetype = data_helper.get_items('assemblies', request.args)
        return Response(resp, mimetype=mimetype, status=200)

class AssembliesQueryApi(Resource):
    def post(self):
        data = request.json if request.is_json else request.form
        resp, mimetype = data_helper.get_items('assemblies', data)
        return Response(resp, mimetype=mimetype, status=200)

class AssembliesImportApi(Resource):
    #import assemblies from a list of accessions
    @admin_required()
    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        resp = assemblies_service.trigger_accessions_job(data)
        return Response(json.dumps(resp), mimetype="application/json", status=200)


class AssemblyApi(Resource):
    def get(self,accession):
        assembly_obj = assemblies_service.get_assembly(accession)
        return Response(assembly_obj.to_json(), mimetype="application/json", status=200)
    
    @admin_required()
    @jwt_required()
    def post(self, accession):
        message = assemblies_service.create_assembly_from_accession(accession)
        return Response(json.dumps(message), mimetype="application/json", status=201)
    
    @admin_required()
    @jwt_required()
    def delete(self,accession):
        deleted_accession = assemblies_service.delete_assembly(accession)
        return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)

class AssembliesFromAnnotations(Resource):
    def get(self):
        resp, mimetype = assemblies_service.get_assemblies_from_annotations(request.args)
        return Response(resp, mimetype=mimetype, status=200)

class AssemblyRelatedAnnotationsApi(Resource):
    def get(self, accession):
        return Response(assemblies_service.get_related_annotations(accession), mimetype="application/json", status=200)

class AssemblyChrAliasesApi(Resource):
    def get(self,accession):
        return assemblies_service.get_chr_aliases_file(accession)
    
class AssembliesRelatedChromosomesApi(Resource):
    def get(self,accession):
        chromosomes = assemblies_service.get_related_chromosomes(accession)
        return Response(chromosomes.to_json(), mimetype="application/json", status=200)

