from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import create_access_token, jwt_required, set_access_cookies, unset_jwt_cookies
from datetime import timedelta
import os
import json
from db.models import Chromosome, CronJob,GeoCoordinates,Annotation, TaxonNode, BioSample,LocalSample, Organism, Assembly, Experiment,BioProject,BioGenomeUser
from flask import current_app as app

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
            access_token = create_access_token(identity=name,expires_delta=timedelta(minutes=2))
            response = Response(json.dumps(dict(msg=f"welcome {name}",role=role)), mimetype="application/json", status=200)
            set_access_cookies(response,access_token)
            return response
        return Response(json.dumps({"msg":"Bad User or Password"}), mimetype="application/json", status=401)
    
    # @jwt_required()
    # def get(self):
    #     app.logger.info('HELLOO')

    @jwt_required()
    def delete(self):
        Annotation.drop_collection()
        TaxonNode.drop_collection()
        GeoCoordinates.drop_collection()
        BioGenomeUser.drop_collection()
        BioProject.drop_collection()
        BioSample.drop_collection()
        LocalSample.drop_collection()
        Organism.drop_collection()
        Assembly.drop_collection()
        Chromosome.drop_collection()
        Experiment.drop_collection()
        CronJob.drop_collection()
        return 200

class Logout(Resource):
    @jwt_required()
    def get(self):
        response = Response(json.dumps({"msg":"Logout succesfull"}), mimetype="application/json", status=201)
        unset_jwt_cookies(response)
        return response

class Users(Resource):
    @jwt_required()
    def get(self):
        response = Response(BioGenomeUser.objects().to_json(), mimetype="application/json", status=200)
        return response

    #create user
    @jwt_required()
    def post(self):
        user_data = request.json  if request.is_json else request.form
        app.logger.info(user_data)
        user = BioGenomeUser.objects(name=user_data['name']).first()
        if user:
            return Response(json.dumps({"msg":f'User {user.name} already exists!'}), mimetype="application/json", status=400)
        new_user = BioGenomeUser(**user_data).save()
        return Response(json.dumps({"msg":f'User {user.name} saved!'}), mimetype="application/json", status=400)

    #update user
    @jwt_required()
    def put(self, name):
        if not name:
            return Response(json.dumps({"msg":'user name is mandatory!'}), mimetype="application/json", status=400)
        user = BioGenomeUser.objects(name=name).first()
        if request.is_json:
            user_data = request.json()
        else:
            user_data = request.form
        user.update(**user_data)
        return Response(json.dumps({"msg":f'User {user.name} updated!'}), mimetype="application/json", status=400)

    @jwt_required()
    def delete(self, name):
        if not name:
            return Response(json.dumps({"msg":'user name is mandatory!'}), mimetype="application/json", status=400)
        user = BioGenomeUser.objects(name=name).first()
        user.delete()
        return Response(json.dumps({"msg":f'User {user.name} deleted!'}), mimetype="application/json", status=400)
