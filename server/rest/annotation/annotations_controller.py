from flask_restful import Resource
from flask import Response, request
from . import annotations_service
import json
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from helpers import data as data_helper

class AnnotationsQueryApi(Resource):
    def post(self):
        data = request.json if request.is_json else request.form
        resp, mimetype = data_helper.get_items('annotations', data)
        return Response(resp, mimetype=mimetype, status=200)
    
class AnnotationsApi(Resource):
    def get(self):
        resp, mimetype = data_helper.get_items('annotations', request.args)
        return Response(resp, mimetype=mimetype, status=200)

    @admin_required()
    @jwt_required()
    def post(self):
        message = annotations_service.create_annotation(request)
        return Response(json.dumps(message), mimetype="application/json", status=201)

class AnnotationApi(Resource):
    def get(self, name):
        ann_obj = annotations_service.get_annotation(name)
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)
    
    @admin_required()
    @jwt_required()
    def put(self, name):
        data = request.json if request.is_json else request.form
        message = annotations_service.update_annotation(name, data)        
        return Response(json.dumps(message), mimetype="application/json", status=200)

    @admin_required()
    @jwt_required()
    def delete(self,name):
        deleted_name = annotations_service.delete_annotation(name)
        return Response(json.dumps(f'{deleted_name} deleted!'), mimetype="application/json", status=201)
    

class StreamAnnotations(Resource):
    def get(self,filename):
        return annotations_service.stream_annotation(filename)