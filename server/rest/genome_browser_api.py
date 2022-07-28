from flask_restful import Resource
from flask import Response, request
from db.models import GenomeBrowserData
from services import annotation_service
from utils import common_functions
import json

FIELDS_TO_EXCLUDE = ['id']


class GenomeBrowserApi(Resource):

    def get(self):
        return Response(common_functions.query_search(GenomeBrowserData, FIELDS_TO_EXCLUDE, **request.args), mimetype="application/json", status=200)

    def post(self,accession):
        data = request.json if request.is_json else request.form
        ##expects a list of annotation objects
        new_annotation = annotation_service.create_annotation(data)
        if new_annotation:
            return Response(new_annotation.to_json(), mimetype="application/json", status=201)

    def delete(self,name):
        deleted_name = annotation_service.delete_annotation(name)
        return Response(json.dumps(deleted_name), mimetype="application/json", status=201)

    def put(self,name):
        data = request.json if request.is_json else request.form
        updated_annotation = annotation_service.update_annotation(name,data)
        return Response(json.dumps(updated_annotation), mimetype="application/json", status=201)
    # ##get last created model object

