import json
from . import users_service
from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import jwt_required, unset_jwt_cookies, get_jwt_identity
from wrappers.admin import admin_required

class LoginApi(Resource):
    @jwt_required()
    def get(self):
        current_user = get_jwt_identity()
        return Response(json.dumps(current_user), mimetype="application/json",status=200)

    def post(self):
        payload = request.json if request.is_json else request.form 
        return users_service.login_user(payload)

class LogoutApi(Resource):
    @jwt_required()
    def get(self):
        response = Response(json.dumps({"msg":"Logout successfull"}), mimetype="application/json", status=200)
        unset_jwt_cookies(response)
        return response

class UsersApi(Resource):
    @jwt_required()
    @admin_required()
    def get(self):
        json_resp = users_service.get_users(**request.args)
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self):
        data = request.json if request.is_json else request.form
        resp = users_service.create_user(data)
        return Response(json.dumps(resp), mimetype="application/json", status=201)


class UserApi(Resource):
    @jwt_required()
    @admin_required()
    def get(self,name):
        user = users_service.get_user(name)
        return Response(user.to_json(), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def put(self,name):
        data = request.json if request.is_json else request.form
        message = users_service.update_user(name,data)
        return Response(json.dumps(message), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def delete(self,name):
        message = users_service.delete_user(name)
        return Response(json.dumps(message), mimetype="application/json", status=200)

class UserRelatedSpecies(Resource):
    @jwt_required()
    def get(self, name):
        response = users_service.get_related_species(name, **request.args)
        return Response(response, mimetype="application/json", status=200)

class UserRelatedSamples(Resource):
    @jwt_required()
    def get(self, name):
        response = users_service.get_related_samples(name)
        return Response(response, mimetype="application/json", status=200)
