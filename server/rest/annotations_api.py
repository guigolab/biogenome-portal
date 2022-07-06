from flask_restful import Resource
from flask import Response, request
from services import annotations_service
import json
##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class AnnotationApi(Resource):

    def get(self):
        return Response(annotations_service.get_annotations(**request.args), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        new_annotation = annotations_service.create_annotation_from_data(data)
        if new_annotation:
            return Response(new_annotation.to_json(), mimetype="application/json", status=201)

    def delete(self,name):
        deleted_name = annotations_service.delete_annotation(name)
        return Response(json.dumps(deleted_name), mimetype="application/json", status=201)

    def put(self,name):
        data = request.json if request.is_json else request.form
        updated_annotation = annotations_service.update_annotation(name,data)
        return Response(json.dumps(updated_annotation), mimetype="application/json", status=201)
    # ##get last created model object

