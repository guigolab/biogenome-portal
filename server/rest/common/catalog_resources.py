"""
Unified catalog collection endpoints:

- GET  /api/<catalog_model>
- POST /api/<catalog_model>/query

POST on the collection path itself is only defined for ``organisms`` and
``annotations`` (create); other catalog keys return 405 for POST.
"""

from __future__ import annotations

import json

from flask import Response, request
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask_restful import Resource
from werkzeug.exceptions import MethodNotAllowed

from rest.common.resource_mixins import (
    json_message,
    list_resource_from_args,
    list_resource_from_payload,
    read_payload,
)
from ..annotation import annotations_service
from ..organism import organisms_service


def _forbidden(msg: str) -> Response:
    return Response(
        json.dumps({"message": msg}),
        mimetype="application/json",
        status=403,
    )


class CatalogListApi(Resource):
    def get(self, catalog_key: str):
        return list_resource_from_args(catalog_key)

    def post(self, catalog_key: str):
        if catalog_key == "organisms":
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if not (role and (role == "DataManager" or role == "Admin")):
                return _forbidden("Data managers only!")
            data = read_payload()
            message, status = organisms_service.create_organism(data)
            return json_message(message, status=status)

        if catalog_key == "annotations":
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if not (role and role == "Admin"):
                return _forbidden("Admins only!")
            message = annotations_service.create_annotation(request)
            return json_message("Annotation created", status=201, name=message)

        raise MethodNotAllowed()


class CatalogQueryApi(Resource):
    def post(self, catalog_key: str):
        return list_resource_from_payload(catalog_key)
