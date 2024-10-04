from flask import Response, request
from flask_restful import Resource
from . import local_samples_service
import json
from flask_jwt_extended import jwt_required

class LocalSamplesApi(Resource):
    def get(self):
        response, mimetype, status = local_samples_service.get_local_samples(request.args)
        return Response(response, mimetype=mimetype, status=status)

class LocalSampleApi(Resource):

    def get(self, local_id):
        local_sample = local_samples_service.get_local_sample(local_id)
        return Response(local_sample.to_json(), mimetype="application/json", status=200)
    
    @jwt_required()
    def delete(self,local_id):
        deleted_local_id = local_samples_service.delete_local_sample(local_id)
        return Response(json.dumps(deleted_local_id), mimetype="application/json", status=200)
