"""
Unified catalog collection endpoints:

- GET  /api/<catalog_model>
- POST /api/<catalog_model>/query

POST on the collection path itself is only defined for ``organisms`` and
``annotations`` (create); other catalog keys return 405 for POST.
"""

from __future__ import annotations

from typing import Set

from flask import request
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from flask_restful import Resource
from werkzeug.exceptions import BadRequest
from werkzeug.exceptions import MethodNotAllowed

from helpers.resource_mixins import (
    json_message,
    list_resource_from_args,
    list_resource_from_payload,
    read_payload,
)
from services import annotations, organisms


def _require_roles(allowed_roles: Set[str], forbidden_message: str):
    """
    After ``verify_jwt_in_request``, return a 403 JSON response if the JWT role
    is missing or not in ``allowed_roles``; otherwise return None.
    """
    verify_jwt_in_request()
    claims = get_jwt()
    role = claims.get("role")
    if role and role in allowed_roles:
        return None
    return json_message(forbidden_message, status=403)


class CatalogListApi(Resource):
    def get(self, catalog_key: str):
        return list_resource_from_args(catalog_key)

    def post(self, catalog_key: str):
        if catalog_key == "organisms":
            denied = _require_roles(
                {"DataManager", "Admin"},
                "Data managers only!",
            )
            if denied is not None:
                return denied
            data = read_payload()
            try:
                created_taxid = organisms.create_organism(data)
                return json_message("Organism created", status=201, taxid=created_taxid)
            except BadRequest as e:
                return json_message(e.description or "Invalid organism payload", status=400)

        if catalog_key == "annotations":
            denied = _require_roles({"Admin"}, "Admins only!")
            if denied is not None:
                return denied
            message = annotations.create_annotation(request)
            return json_message("Annotation created", status=201, name=message)

        raise MethodNotAllowed()


class CatalogQueryApi(Resource):
    def post(self, catalog_key: str):
        return list_resource_from_payload(catalog_key)
