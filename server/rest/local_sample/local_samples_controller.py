from flask import Response, request
from flask_restful import Resource
from db.models import LocalSample
from . import local_samples_service
import json
from errors import NotFound
from flask_jwt_extended import jwt_required
from bson import json_util
# #CRUD operations on sample
FIELDS_TO_EXCLUDE = ['id','created','last_check']


class LocalSamplesApi(Resource):

    def get(self):
        total, data = local_samples_service.get_local_samples(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp, default=json_util.default), mimetype="application/json", status=200)


    # def post(self):
    #     data = request.json if request.is_json else request.form
    #     message, status = local_samples_service.create_local_sample(request.args)
    #     return Response(json.dumps(message), mimetype="application/json", status=status)

class LocalSampleApi(Resource):

    def get(self, local_id):
        local_sample = LocalSample.objects(local_id=local_id).first()
        if not local_sample:
            raise NotFound
        return Response(local_sample.to_json(), mimetype="application/json", status=200)

    @jwt_required()
    def put(self,local_id):
        local_sample = LocalSample.objects(local_id=local_id).first()
        if not local_sample:
            raise NotFound
        data = request.json if request.is_json else request.form 
        message, status = local_samples_service.update_local_sample(local_sample, data)
        return Response(json.dumps(message), mimetype="application/json", status=status)

    
    @jwt_required()
    def delete(self,local_id):
        deleted_local_id = local_samples_service.delete_local_sample(local_id)
        if deleted_local_id:
            return Response(json.dumps(deleted_local_id), mimetype="application/json", status=201)
