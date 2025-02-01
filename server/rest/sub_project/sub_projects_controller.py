from flask import Response,request
from flask_restful import Resource
from flask_jwt_extended import jwt_required
from wrappers import admin
from helpers.data import dump_json
from . import sub_projects_service
import json

class SubProjectsApi(Resource):
    @jwt_required()
    def get(self):
        response, mimetype = sub_projects_service.get_sub_projects(request.args)
        return Response(response, mimetype=mimetype, status=200)

    @jwt_required()
    @admin.admin_required()
    def post(self):
        data = request.json if request.is_json else request.form
        message, status = sub_projects_service.create_sub_project(data)
        #create subproject
        return Response(json.dumps(message),mimetype='application/json', status=status)
    
class SubProjectApi(Resource):
    @jwt_required()
    def get(self,name): 
        project = sub_projects_service.get_sub_project(name)
        ## get sub_project
        return Response(dump_json(project.to_mongo().to_dict()),mimetype='application/json',status=200)
    
    @jwt_required()
    @admin.admin_required()
    def put(self, name):
        message = sub_projects_service.update_sub_project(name)
        ##update sub_project
        return Response(json.dumps(message),mimetype='application/json', status=201)

    @jwt_required()
    @admin.admin_required()
    def delete(self, name):
        ## delete sub_project
        message = sub_projects_service.delete_sub_project(name)
        ##update sub_project
        return Response(json.dumps(message),mimetype='application/json', status=201)
    
class SubProjectRelatedSpecies(Resource):
    @jwt_required()
    def get(self, name):
        organisms = sub_projects_service.get_related_species(name)
        ## get related species
        return Response(organisms,mimetype='application/json', status=200)

    
class SubProjectRelatedUsers(Resource):
    @jwt_required()
    def get(self, name):
        users = sub_projects_service.get_related_users(name)
        return Response(users, mimetype='application/json', status=200)
