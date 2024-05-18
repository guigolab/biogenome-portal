import json
from . import users_service
from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import jwt_required, unset_jwt_cookies
from utils.wrappers.admin import admin_required

class LoginApi(Resource):
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
        total, data = users_service.get_users(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self):
        data = request.json if request.is_json else request.form
        message, status = users_service.create_user(data)
        return Response(json.dumps(message), mimetype="application/json", status=status)


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
        message, status = users_service.update_user(name,data)
        return Response(json.dumps(message), mimetype="application/json", status=status)

    @jwt_required()
    @admin_required()
    def delete(self,name):
        message, status = users_service.delete_user(name)
        return Response(json.dumps(message), mimetype="application/json", status=status)
