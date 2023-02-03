import json
from . import users_service
from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import create_access_token, jwt_required, set_access_cookies, unset_jwt_cookies
from datetime import timedelta
from db.models import BioGenomeUser

class LoginApi(Resource):
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

class LogoutApi(Resource):
    @jwt_required()
    def get(self):
        response = Response(json.dumps({"msg":"Logout succesfull"}), mimetype="application/json", status=201)
        unset_jwt_cookies(response)
        return response

class UsersApi(Resource):

    @jwt_required()
    def get(self):
        total, data = users_service.get_users(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

    ##create user
    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        response = users_service.create_user(data)
        return Response(json.dumps(response), mimetype="application/json", status=201)

class UserApi(Resource):

    @jwt_required()
    def put(self,name):
        data = request.json if request.is_json else request.form
        response = users_service.update_user(name,data)
        return Response(response, mimetype="application/json", status=200)


    @jwt_required()
    def delete(self,name):
        response = users_service.delete_user(name)
        return Response(response, mimetype="application/json", status=200)
