from flask import request
from flask_restful import Resource
from flask_jwt_extended import jwt_required

from db.model import LocalSample
from helpers.resource_mixins import (
    document_json_response,
    json_message,
    json_response,
    read_payload,
)
from helpers.service_utils import get_or_404
from services import local_samples


class LocalSampleUploadApi(Resource):
    @jwt_required()
    def post(self):
        # Multipart: form fields + ``excel`` file; file is stored under TMP_DIR and only its path is sent to Celery.
        payload = read_payload(request)
        form_data = dict(payload, **request.files)
        body, status = local_samples.parse_excel(**form_data)
        return json_response(body, status=status)


class LocalSampleApi(Resource):
    def get(self, local_id):
        local_sample = get_or_404(LocalSample, f"Local Sample {local_id} not found!", local_id=local_id)
        return document_json_response(local_sample)
    
    @jwt_required()
    def delete(self,local_id):
        deleted_local_id = local_samples.delete_local_sample(local_id)
        return json_message("Local sample deleted", status=200, local_id=deleted_local_id)


