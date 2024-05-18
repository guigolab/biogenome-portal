from flask_restful import Resource
from flask import Response, request
from . import status_service


class StatusItemsApi(Resource):

    def get(self):
        response, mimetype, status = status_service.get_status(request.args)
        return Response(response, mimetype=mimetype, status=status)
