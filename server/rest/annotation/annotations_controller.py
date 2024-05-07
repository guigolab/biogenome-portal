from flask_restful import Resource
from flask import Response, request, send_from_directory
from db.models import GenomeAnnotation
from . import annotations_service
from errors import NotFound
import json
from flask_jwt_extended import jwt_required
from ..utils import wrappers


ANNOTATION_FOLDER = 'annotations_data'

FIELDS_TO_EXCLUDE = ['id','created']

class AnnotationsApi(Resource):
    def get(self):
        response, mimetype, status = annotations_service.get_annotations(request.args)
        return Response(response, mimetype=mimetype, status=status)

    @wrappers.admin_required()
    @jwt_required()
    def post(self):
        message,status = annotations_service.create_annotation(request)
        return Response(json.dumps(message), mimetype="application/json", status=status)

class AnnotationApi(Resource):
    def get(self, name):
        ann_obj = GenomeAnnotation.objects(name=name).exclude(*FIELDS_TO_EXCLUDE).first()
        if not ann_obj:
            raise NotFound
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)
    
    @wrappers.admin_required()
    @jwt_required()
    def put(self, name):
        ann_obj = GenomeAnnotation.objects(name=name).first()
        if not ann_obj:
            raise NotFound
        data = request.json
        ann_obj.save(**data)
        return Response(ann_obj.to_json(), mimetype="application/json", status=201)

    @wrappers.admin_required()
    @jwt_required()
    def delete(self,name):
        deleted_name = annotations_service.delete_annotation(name)
        return Response(json.dumps(f'{deleted_name} deleted!'), mimetype="application/json", status=201)
    

class StreamAnnotations(Resource):
    def get(self,filename):
        mime_type = 'text/gff'
        return send_from_directory(ANNOTATION_FOLDER, filename, conditional=True, mimetype=mime_type)