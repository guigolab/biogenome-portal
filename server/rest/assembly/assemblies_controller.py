import io
from flask_restful import Resource
from flask import Response, request, send_file
import json
from db.models import Assembly,GenomeAnnotation
from . import assemblies_service
from errors import NotFound
from flask_jwt_extended import jwt_required
from wrappers.data_manager import data_manager_required
from wrappers.admin import admin_required

FIELDS_TO_EXCLUDE = ['id','created', 'chromosomes_aliases']


class AssembliesApi(Resource):

    def get(self):
        resp, mimetype, status = assemblies_service.get_assemblies(request.args)
        return Response(resp, mimetype=mimetype, status=status)

class AssemblyApi(Resource):

    def get(self,accession):
        assembly_obj = assemblies_service.get_assembly(accession)
        return Response(assembly_obj.to_json(), mimetype="application/json", status=200)
    
    @admin_required()
    @jwt_required()
    def post(self, accession):
        message,status = assemblies_service.create_assembly_from_accession(accession)
        return Response(message, mimetype="application/json", status=status)
    
    @admin_required()
    @jwt_required()
    def delete(self,accession):
        deleted_accession = assemblies_service.delete_assembly(accession)
        return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)


class AssemblyRelatedAnnotationsApi(Resource):
    def get(self, accession):
        assembly_obj = Assembly.objects(accession=accession).first()
        if not assembly_obj:
            raise NotFound
        annotations = GenomeAnnotation.objects(assembly_accession=accession)
        return Response(annotations.to_json(), mimetype="application/json", status=200)

class AssemblyChrAliasesApi(Resource):

    def get(self,accession):
        assembly_obj = Assembly.objects(accession=accession).first()
        if not assembly_obj or not assembly_obj.chromosomes_aliases:
            raise NotFound
        return send_file(
        io.BytesIO(assembly_obj.chromosomes_aliases),
        mimetype='text/plain',
        as_attachment=True,
        download_name=f'{assembly_obj.accession}_chr_aliases.txt')
    
    @data_manager_required()
    @jwt_required()
    def post(self,accession):
        assembly_obj = Assembly.objects(accession=accession).first()
        if not assembly_obj:
            raise NotFound
        aliases_file = request.files.get('chr_aliases')
        msg, status = assemblies_service.store_chromosome_aliases(assembly_obj, aliases_file)
        return Response(json.dumps(msg), mimetype="application/json", status=status)

class AssembliesRelatedChromosomesApi(Resource):
    def get(self,accession):
        chromosomes = assemblies_service.get_assembly_related_chromosomes(accession)
        return Response(chromosomes.to_json(), mimetype="application/json", status=200)
