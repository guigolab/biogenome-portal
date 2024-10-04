from flask_restful import Resource
from flask import Response, request
from helpers import data

class StatusItemsApi(Resource):

    def get(self):
        response, mimetype, status = data.get_items('status', request.args)
        return Response(response, mimetype=mimetype, status=status)
