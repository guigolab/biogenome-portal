from flask_restful import Resource
from flask import Response, request
from db.models import GenomeBrowserData
from services import genome_browser_service
from utils import common_functions
from errors import NotFound
import json
from flask_jwt_extended import jwt_required


FIELDS_TO_EXCLUDE = ['id']


class GenomeBrowserApi(Resource):

    def get(self,accession=None):
        if accession:
            genome_br_obj = GenomeBrowserData.objects(assembly_accession=accession).exclude('id').first()
            if not genome_br_obj:
                raise NotFound
            return Response(genome_br_obj.to_json(),mimetype="application/json", status=200)
        return Response(common_functions.query_search(GenomeBrowserData, FIELDS_TO_EXCLUDE, **request.args), mimetype="application/json", status=200)
    
    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        ##expects a list of annotation objects
        resp = genome_browser_service.create_genome_browser_data(data)
        return Response(json.dumps(resp['message']), mimetype="application/json", status=resp['status'])
    
    @jwt_required()
    def delete(self,accession):
        deleted_accession = genome_browser_service.delete_genome_browser_data(accession)
        return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
    
    @jwt_required()
    def put(self,accession):
        data = request.json if request.is_json else request.form
        update_accession = genome_browser_service.update_genome_browser_data(accession,data)
        return Response(json.dumps(update_accession), mimetype="application/json", status=201)
    # ##get last created model object

