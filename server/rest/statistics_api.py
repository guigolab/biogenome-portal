from flask_restful import Resource
from flask import Response, request
from services.statistics_service import get_data_count
##post request to handle large list of assemblie/experiment ids
class StatisticsApi(Resource):
    

    ##get last created model object
    def get(self):
        return Response(get_data_count(**request.args), mimetype="application/json", status=200)
 
