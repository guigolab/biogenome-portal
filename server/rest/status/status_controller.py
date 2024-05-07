from flask_restful import Resource
from flask import Response, request
from . import status_service


FIELDS_TO_EXCLUDE = ['id','created']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class StatusItemsApi(Resource):

    def get(self):
        response, mimetype, status = status_service.get_status(request.args)
        return Response(response, mimetype=mimetype, status=status)

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids