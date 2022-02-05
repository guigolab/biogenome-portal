from flask import current_app as app
from db.models import Organism,TaxonNode,Experiment,Assembly,SecondaryOrganism
from flask_restful import Resource
import services.taxon_service as service
from errors import InternalServerError
from flask import Response, request
from flask_jwt_extended import create_access_token
from datetime import timedelta
import xml.etree.ElementTree as ET
import os



#Endpoint to drop db collections


# class InputDataApi(Resource):
#     def get(self, value):
#         submission_file = service.create_submission_xml(value)
#         return Response(ET.tostring(submission_file), mimetype='application/xml', status=200)
    
#     def post(self):
#         try:
#             data = request.get_json()
#             sample_xml = service.create_xml(data)
#             return Response(ET.tostring(sample_xml), mimetype='application/xml', status=200)
#         except Exception as e:
#             app.logger.error(e)
#         raise InternalServerError

# #Endpoint to drop db collections
#     def delete(self):
#         TaxonNode.drop_collection()
#         SecondaryOrganism.drop_collection()
#         Organism.drop_collection()
#         Assembly.drop_collection()
#         Experiment.drop_collection()
#         return 200

class Login(Resource):
    def post(self):
        if request.is_json:
            user = request.json["user"]
            password = request.json["password"]
        else:
            user = request.form["user"]
            password = request.form["password"]
        if user == os.getenv('USER') and password == os.getenv('RESTKEY'):
            access_token = create_access_token(identity=user,expires_delta=timedelta(minutes=30))
            return Response(access_token, mimetype="application/json", status=201)
        else:
            return Response("Bad User or Password", mimetype="application/json", status=401)
