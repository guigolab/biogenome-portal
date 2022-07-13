from flask_restful import Resource
from flask import Response, request
from db.models import Annotation
from services import bulk_load_service
from utils import common_functions
import json



class BulkLoadApi(Resource):

    def get(self, model):
        response, status = bulk_load_service.get_data(model)
        return Response(response, mimetype="application/json", status=status)

    # def post(self, model):
    #     data = request.json if request.is_json else request.form
    #     bulk_load_service.load_data(model,data)

    # def delete(self,name):
    #     deleted_name = annotation.delete_annotation(name)
    #     return Response(json.dumps(deleted_name), mimetype="application/json", status=201)

    # def put(self,name):
    #     data = request.json if request.is_json else request.form
    #     updated_annotation = annotation.update_annotation(name,data)
    #     return Response(json.dumps(updated_annotation), mimetype="application/json", status=201)
    # # ##get last created model object

