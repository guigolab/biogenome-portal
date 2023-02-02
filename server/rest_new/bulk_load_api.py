from flask_restful import Resource
from flask import Response
from services import bulk_load_service



class BulkLoadApi(Resource):

    def get(self, model):
        response, status = bulk_load_service.get_data(model)
        return Response(response, mimetype="application/json", status=status)

