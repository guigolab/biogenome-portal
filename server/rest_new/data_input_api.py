from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import create_access_token, jwt_required, set_access_cookies, unset_jwt_cookies
from datetime import timedelta
import os
import json
from db.models import Chromosome, CronJob, GenomeBrowserData,GeoCoordinates,Annotation, TaxonNode, BioSample,LocalSample, Organism, Assembly, Experiment,BioProject,BioGenomeUser

class Login(Resource):
    def post(self):
        if request.is_json:
            name = request.json["name"]
            password = request.json["password"]
        else:
            name = request.form["name"]
            password = request.form["password"]
        user_obj = BioGenomeUser.objects(name=name).first()
        if user_obj and user_obj.password == password:
            role = user_obj.role.value
            name = user_obj.name
        else:
            role = None
        if role:
            access_token = create_access_token(identity=name,expires_delta=timedelta(minutes=30))
            response = Response(json.dumps(dict(msg=f"welcome {name}",role=role)), mimetype="application/json", status=200)
            set_access_cookies(response,access_token)
            return response
        return Response(json.dumps({"msg":"Bad User or Password"}), mimetype="application/json", status=401)
    
    # @jwt_required()
    # def delete(self):
    #     Annotation.drop_collection()
    #     GenomeBrowserData.drop_collection()
    #     TaxonNode.drop_collection()
    #     GeoCoordinates.drop_collection()
    #     BioGenomeUser.drop_collection()
    #     BioProject.drop_collection()
    #     BioSample.drop_collection()
    #     LocalSample.drop_collection()
    #     Organism.drop_collection()
    #     Assembly.drop_collection()
    #     Chromosome.drop_collection()
    #     Experiment.drop_collection()
    #     CronJob.drop_collection()
    #     return 200

class Logout(Resource):
    @jwt_required()
    def get(self):
        response = Response(json.dumps({"msg":"Logout succesfull"}), mimetype="application/json", status=201)
        unset_jwt_cookies(response)
        return response