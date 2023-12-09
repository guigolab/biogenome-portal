import io
from flask_restful import Resource
from flask import Response, request, send_file
import json
from db.models import Assembly,GenomeAnnotation
from . import assemblies_service
from errors import NotFound
from flask_jwt_extended import jwt_required

FIELDS_TO_EXCLUDE = ['id','created']


class AssembliesApi(Resource):

    def get(self):
        total, data = assemblies_service.get_assemblies(**request.args)
        json_resp = dict(total=total, data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

class AssemblyApi(Resource):

    def get(self,accession):
        assembly_obj = Assembly.objects(accession=accession).exclude('id','created','chromosomes_aliases').first()
        if not assembly_obj:
            raise NotFound
        if assembly_obj.chromosomes:
            assembly_obj.chromosomes = assemblies_service.get_chromosomes(accession)
        return Response(assembly_obj.to_json(), mimetype="application/json", status=200)
    
    @jwt_required()
    def post(self,accession):
        response = assemblies_service.create_assembly_from_accession(accession)
        return Response(response['message'], mimetype="application/json", status=response['status'])

    @jwt_required()
    def delete(self,accession):
        deleted_accession = assemblies_service.delete_assembly(accession)
        if deleted_accession:
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

    def post(self,accession):
        assembly_obj = Assembly.objects(accession=accession).first()
        if not assembly_obj:
            raise NotFound
        aliases_file = request.files.get('chr_aliases')
        assemblies_service.store_chromosome_aliases(assembly_obj, aliases_file)
