from flask import Response, request
from flask_restful import Resource
from db.models import LocalSample
from . import local_samples_service
import json
from errors import NotFound
from flask_jwt_extended import jwt_required
# #CRUD operations on sample
FIELDS_TO_EXCLUDE = ['id','created','last_check']


class LocalSamplesApi(Resource):

    def get(self):
        total, data = local_samples_service.get_local_samples(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

class LocalSampleApi(Resource):

    def get(self, local_id):
        local_sample = LocalSample.objects(local_id=local_id).first()
        if not local_sample:
            raise NotFound
        return Response(local_sample.to_json(), mimetype="application/json", status=200)

    @jwt_required()
    def delete(self,local_id):
        deleted_local_id = local_samples_service.delete_local_sample(local_id)
        if deleted_local_id:
            return Response(json.dumps(deleted_local_id), mimetype="application/json", status=201)
