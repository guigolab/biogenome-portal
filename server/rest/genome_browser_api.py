from flask_restful import Resource
from flask import Response, request
from db.models import GenomeBrowserData
from services import genome_browser_service
from utils import common_functions
import json

FIELDS_TO_EXCLUDE = ['id']


class GenomeBrowserApi(Resource):

    def get(self):
        return Response(common_functions.query_search(GenomeBrowserData, FIELDS_TO_EXCLUDE, **request.args), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        ##expects a list of annotation objects
        resp = genome_browser_service.create_genome_browser_data(data)
        return Response(json.dumps(resp['message']), mimetype="application/json", status=resp['status'])

    def delete(self,accession):
        deleted_accession = genome_browser_service.delete_genome_browser_data(accession)
        return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)

    def put(self,accession):
        data = request.json if request.is_json else request.form
        update_accession = genome_browser_service.update_genome_browser_data(accession,data)
        return Response(json.dumps(update_accession), mimetype="application/json", status=201)
    # ##get last created model object
