import json

from flask import Response, request
from flask_restful import Resource
from flask_jwt_extended import jwt_required

from db.models import LocalSample
from rest.common.resource_mixins import (
    json_message,
    json_response,
    read_payload,
)
from rest.common.service_utils import get_or_404
from . import local_samples_service


class LocalSampleUploadApi(Resource):
    @jwt_required()
    def post(self):
        # Multipart: form fields + ``excel`` file; file is stored under TMP_DIR and only its path is sent to Celery.
        payload = read_payload(request)
        form_data = dict(payload, **request.files)
        messages, status = local_samples_service.parse_excel(**form_data)
        if isinstance(messages, dict):
            return json_response(messages, status=status)
        return json_message(messages, status=status)


class LocalSampleApi(Resource):
    def get(self, local_id):
        local_sample = get_or_404(LocalSample, f"Local Sample {local_id} not found!", local_id=local_id)
        return Response(local_sample.to_json(), mimetype="application/json", status=200)
    
    @jwt_required()
    def delete(self,local_id):
        deleted_local_id = local_samples_service.delete_local_sample(local_id)
        return json_message("Local sample deleted", status=200, local_id=deleted_local_id)


