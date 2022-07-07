from flask import Response, request
from flask_restful import Resource
from db.models import LocalSample
from services import local_sample
import json
from utils import common_functions
# #CRUD operations on sample
FIELDS_TO_EXCLUDE = ['id','created','last_check']

class LocalSampleApi(Resource):

    def get(self, local_id=None):
        return Response(common_functions.query_search(LocalSample, FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)

    def delete(self,local_id):
        deleted_local_id = local_sample.delete_local_sample(local_id)
        if deleted_local_id:
            return Response(json.dumps(deleted_local_id), mimetype="application/json", status=201)
