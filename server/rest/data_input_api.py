from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import create_access_token
from datetime import timedelta
import os
import json
from db.models import TaxonNode, SecondaryOrganism, Organism, Assembly, Experiment

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
            return Response(json.dumps(access_token), mimetype="application/json", status=201)
        else:
            return Response("Bad User or Password", mimetype="application/json", status=401)
    
    def delete(self):
        TaxonNode.drop_collection()
        SecondaryOrganism.drop_collection()
        Organism.drop_collection()
        Assembly.drop_collection()
        Experiment.drop_collection()
        return 200