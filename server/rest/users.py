import json
from services import users
from flask_restful import Resource
from flask import Response, request
from flask_jwt_extended import jwt_required, unset_jwt_cookies, get_jwt_identity
from wrappers.admin import admin_required
from wrappers.own_account import own_account_required
from helpers.resource_mixins import document_json_response

class LoginApi(Resource):
    @jwt_required()
    def get(self):
        current_user = get_jwt_identity()
        return Response(json.dumps(current_user), mimetype="application/json",status=200)

    def post(self):
        payload = request.json if request.is_json else request.form 
        return users.login_user(payload)

class LogoutApi(Resource):
    @jwt_required()
    def get(self):
        response = Response(json.dumps({"msg":"Logout successfull"}), mimetype="application/json", status=200)
        unset_jwt_cookies(response)
        return response

class UsersApi(Resource):
    """Lists portal users; the DB root user (``DB_USER``) is excluded in the service layer."""

    @jwt_required()
    @admin_required()
    def get(self):
        json_resp = users.get_users(**request.args)
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self):
        data = request.json if request.is_json else request.form
        resp = users.create_user(data)
        return Response(json.dumps(resp), mimetype="application/json", status=201)


class UserApi(Resource):
    """Admin-only user CRUD. See ``services.users`` for root exclusion and cross-admin rules."""

    @jwt_required()
    @admin_required()
    def get(self,name):
        user = users.get_user(name)
        return document_json_response(user)

    @jwt_required()
    @admin_required()
    def put(self,name):
        data = request.json if request.is_json else request.form
        message = users.update_user(name,data)
        return Response(json.dumps(message), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def delete(self,name):
        message = users.delete_user(name)
        return Response(json.dumps(message), mimetype="application/json", status=200)

    @jwt_required()
    @own_account_required()
    def patch(self, name):
        data = request.json if request.is_json else request.form
        message = users.update_self(name, data)
        return Response(json.dumps(message), mimetype="application/json", status=200)

class UserRelatedSpecies(Resource):
    @jwt_required()
    def get(self, name):
        response = users.get_related_species(name, **request.args)
        return Response(response, mimetype="application/json", status=200)

# class HandleOrganismToUser(Resource):
#     @jwt_required()
#     @admin_required()
#     def patch(self, name, taxid):
#         response = users.manage_species_to_user(name, taxid, **request.args)
#         return Response(response, mimetype="application/json", status=200)

class UserRelatedSamples(Resource):
    @jwt_required()
    def get(self, name):
        response = users.get_related_samples(name)
        return Response(response, mimetype="application/json", status=200)

class UserSubmittedSamples(Resource):
    @jwt_required()
    def get(self, name):
        response = users.get_submitted_biosamples(name)
        return Response(response, mimetype="application/json", status=200)

class UserLookup(Resource):
    @jwt_required()
    def get(self, name):
        response = users.lookup_user_data(name)
        return Response(json.dumps(response), mimetype="application/json", status=200)
