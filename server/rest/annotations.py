from flask_restful import Resource
from flask import request
from services import annotations
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from db.model import GenomeAnnotation
from helpers.resource_mixins import document_json_response, json_message, read_payload
from helpers.service_utils import get_or_404


class AnnotationApi(Resource):
    def get(self, name):
        ann_obj = get_or_404(GenomeAnnotation, f"Annotation {name} not found", name=name)
        return document_json_response(ann_obj)
    
    @admin_required()
    @jwt_required()
    def put(self, name):
        data = read_payload(request)
        message = annotations.update_annotation(name, data)        
        return json_message("Annotation updated", status=200, name=message)

    @admin_required()
    @jwt_required()
    def delete(self,name):
        deleted_name = annotations.delete_annotation(name)
        return json_message("Annotation deleted", status=201, name=deleted_name)
    

class StreamAnnotations(Resource):
    def get(self,filename):
        return annotations.stream_annotation(filename)
