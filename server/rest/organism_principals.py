import json

from flask import Response, request
from flask_jwt_extended import jwt_required
from flask_restful import Resource

from helpers.resource_mixins import document_json_response, json_message, read_payload
from services import organism_principals
from wrappers.admin import admin_required


class OrganismPrincipalOptionsApi(Resource):
    """GET /api/organism_principals/options — {slug, name} pairs for combobox UIs."""

    def get(self):
        options = organism_principals.list_principal_options()
        return Response(json.dumps(options), mimetype="application/json", status=200)


class OrganismPrincipalsApi(Resource):
    def get(self):
        payload = organism_principals.list_principals(**request.args)
        return Response(json.dumps(payload), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self):
        data = read_payload(request)
        slug = organism_principals.create_principal(data)
        return json_message("Principal created", status=201, slug=slug)


class OrganismPrincipalApi(Resource):
    def get(self, slug):
        principal = organism_principals.get_principal(slug)
        return document_json_response(principal)

    @jwt_required()
    @admin_required()
    def put(self, slug):
        data = read_payload(request)
        updated_slug = organism_principals.update_principal(slug, data)
        return json_message("Principal updated", status=200, slug=updated_slug)

    @jwt_required()
    @admin_required()
    def delete(self, slug):
        deleted_slug = organism_principals.delete_principal(slug)
        return json_message(f"Principal {deleted_slug} deleted", status=200)
