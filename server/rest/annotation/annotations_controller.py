from flask_restful import Resource
from flask import Response, request
from . import annotations_service
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from db.models import GenomeAnnotation
from rest.common.resource_mixins import json_message, read_payload
from rest.common.service_utils import get_or_404


class AnnotationApi(Resource):
    def get(self, name):
        ann_obj = get_or_404(GenomeAnnotation, f"Annotation {name} not found", name=name)
        return Response(ann_obj.to_json(),mimetype="application/json", status=200)
    
    @admin_required()
    @jwt_required()
    def put(self, name):
        data = read_payload(request)
        message = annotations_service.update_annotation(name, data)        
        return json_message("Annotation updated", status=200, name=message)

    @admin_required()
    @jwt_required()
    def delete(self,name):
        deleted_name = annotations_service.delete_annotation(name)
        return json_message("Annotation deleted", status=201, name=deleted_name)
    

class StreamAnnotations(Resource):
    def get(self,filename):
        return annotations_service.stream_annotation(filename)