from flask_restful import Resource
from flask import Response, request, send_from_directory
from . import annotations_service
import json
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required


ANNOTATION_FOLDER = '/server/annotations_data'


class AnnotationsApi(Resource):
    def get(self):
        response, mimetype, status = annotations_service.get_annotations(request.args)
        return Response(response, mimetype=mimetype, status=status)

    @admin_required()
    @jwt_required()
    def post(self):
        message,status = annotations_service.create_annotation(request)
        return Response(json.dumps(message), mimetype="application/json", status=status)

class AnnotationApi(Resource):
    def get(self, name):
        ann_obj = annotations_service.get_annotation(name)
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)
    
    @admin_required()
    @jwt_required()
    def put(self, name):
        data = request.json if request.is_json else request.form
        message, status = annotations_service.update_annotation(name, data)        
        return Response(json.dumps(message), mimetype="application/json", status=status)

    @admin_required()
    @jwt_required()
    def delete(self,name):
        deleted_name = annotations_service.delete_annotation(name)
        return Response(json.dumps(f'{deleted_name} deleted!'), mimetype="application/json", status=201)
    

class StreamAnnotations(Resource):
    def get(self,filename):
        mime_type = 'binary/octet-stream'
        return send_from_directory(ANNOTATION_FOLDER, filename, conditional=True, mimetype=mime_type)