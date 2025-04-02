from flask import Response, request
from flask_restful import Resource
from . import local_samples_service
import json
from flask_jwt_extended import jwt_required
import json
from helpers import data as data_helper

class LocalSamplesApi(Resource):
    def get(self):
        resp, mimetype = data_helper.get_items('local_samples', request.args)
        return Response(resp, mimetype=mimetype, status=200)

class LocalSamplesQueryApi(Resource):
    def post(self):
        data = request.json if request.is_json else request.form
        resp, mimetype = data_helper.get_items('local_samples', data)
        return Response(resp, mimetype=mimetype, status=200)

class LocalSampleUploadApi(Resource):
    @jwt_required()
    def post(self):
        payload = request.json if request.is_json else request.form
        form_data = dict(payload, **request.files)
        messages, status = local_samples_service.parse_excel(**form_data)
        return Response(json.dumps(messages), mimetype="application/json", status=status)


class LocalSampleApi(Resource):
    def get(self, local_id):
        local_sample = local_samples_service.get_local_sample(local_id)
        return Response(local_sample.to_json(), mimetype="application/json", status=200)
    
    @jwt_required()
    def delete(self,local_id):
        deleted_local_id = local_samples_service.delete_local_sample(local_id)
        return Response(json.dumps(deleted_local_id), mimetype="application/json", status=200)


