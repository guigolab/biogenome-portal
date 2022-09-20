from flask_restful import Resource
from flask import Response, request
from db.models import Annotation
from services import annotation_service
from utils import common_functions
from errors import NotFound
import json
from flask_jwt_extended import jwt_required

FIELDS_TO_EXCLUDE = ['id','created']

class AnnotationApi(Resource):

    def get(self,name=None):
        if name:
            ann_obj = Annotation.objects(name=name).first()
            if not ann_obj:
                raise NotFound
            return Response(ann_obj.to_json(),mimetype="application/json", status=200)
        return Response(common_functions.query_search(Annotation, FIELDS_TO_EXCLUDE, **request.args), mimetype="application/json", status=200)

    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        ##expects a list of annotation objects
        response = annotation_service.create_annotation(data)
        return Response(json.dumps(response['message']), mimetype="application/json", status=response['status'])
    @jwt_required()
    def delete(self,name):
        deleted_name = annotation_service.delete_annotation(name)
        return Response(json.dumps(deleted_name), mimetype="application/json", status=201)
    
    @jwt_required()
    def put(self,name):
        data = request.json if request.is_json else request.form
        updated_annotation = annotation_service.update_annotation(name,data)
        return Response(json.dumps(updated_annotation), mimetype="application/json", status=201)
    # ##get last created model object

