from flask_restful import Resource
from flask_jwt_extended import jwt_required

from db.model import LocalSample
from helpers.resource_mixins import document_json_response, json_message
from helpers.service_utils import get_or_404
from services import local_samples


class LocalSampleApi(Resource):
    def get(self, local_id):
        local_sample = get_or_404(LocalSample, f"Local Sample {local_id} not found!", local_id=local_id)
        return document_json_response(local_sample)

    @jwt_required()
    def delete(self, local_id):
        deleted_local_id = local_samples.delete_local_sample(local_id)
        return json_message("Local sample deleted", status=200, local_id=deleted_local_id)
