from flask_restful import Resource
from flask import Response
from . import dumps_service



class DumpApi(Resource):

    def get(self, model):
        response, status = dumps_service.get_data(model)
        return Response(response, mimetype="application/json", status=status)

