from flask_restful import Resource
from flask import Response, request
from db.models import Annotation
from . import annotations_service
from utils import common_functions
from errors import NotFound
import json
from flask_jwt_extended import jwt_required

FIELDS_TO_EXCLUDE = ['id','created']

class AnnotationsApi(Resource):
    def get(self):
        total, data = annotations_service.get_annotations(**request.args)
        json_resp = dict(total=total, data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        response = annotations_service.create_annotation(data)
        return Response(json.dumps(response['message']), mimetype="application/json", status=response['status'])
    

class AnnotationApi(Resource):
    def get(self, name):
        ann_obj = Annotation.objects(name=name).exclude(*FIELDS_TO_EXCLUDE).first()
        if not ann_obj:
            raise NotFound
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)
    
    @jwt_required()
    def delete(self,name):
        deleted_name = annotations_service.delete_annotation(name)
        return Response(json.dumps(deleted_name), mimetype="application/json", status=201)
    
    @jwt_required()
    def put(self,name):
        data = request.json if request.is_json else request.form
        updated_annotation = annotations_service.update_annotation(name,data)
        return Response(updated_annotation.to_json(), mimetype="application/json", status=201)

