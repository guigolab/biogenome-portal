from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import create_access_token, jwt_required
from datetime import timedelta
import os
import json
from db.models import Chromosome, GeoCoordinates,Annotation, TaxonNode, BioSample,LocalSample, Organism, Assembly, Experiment,BioProject

class Login(Resource):
    def post(self):
        if request.is_json:
            user = request.json["user"]
            password = request.json["password"]
        else:
            user = request.form["user"]
            password = request.form["password"]
        if user == os.getenv('USR') and password == os.getenv('RESTKEY'):
            access_token = create_access_token(identity=user,expires_delta=timedelta(minutes=30))
            return Response(json.dumps(access_token), mimetype="application/json", status=201)
        else:
            return Response("Bad User or Password", mimetype="application/json", status=401)
    
    # @jwt_required()
    def delete(self):
        Annotation.drop_collection()
        TaxonNode.drop_collection()
        GeoCoordinates.drop_collection()
        BioProject.drop_collection()
        BioSample.drop_collection()
        LocalSample.drop_collection()
        images = Organism.objects(image__ne=None)
        for org in images:
            org.image.delete()
        Organism.drop_collection()
        Assembly.drop_collection()
        Chromosome.drop_collection()
        Experiment.drop_collection()
        return 200