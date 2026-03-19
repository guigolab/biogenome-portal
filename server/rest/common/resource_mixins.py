from flask import Response, request
import json

from helpers import data as data_helper


def read_payload(req=None):
    current_request = req or request
    return current_request.json if current_request.is_json else current_request.form


def build_response(payload, mimetype="application/json", status=200):
    return Response(payload, mimetype=mimetype, status=status)


def list_resource(model_key, params):
    payload, mimetype = data_helper.get_items(model_key, params)
    return build_response(payload, mimetype=mimetype, status=200)


def list_resource_from_args(model_key):
    return list_resource(model_key, request.args)


def list_resource_from_payload(model_key, req=None):
    return list_resource(model_key, read_payload(req=req))


def json_response(payload, status=200):
    return build_response(json.dumps(payload), mimetype="application/json", status=status)


def json_message(message, status=200, **extra):
    payload = {"message": message}
    payload.update(extra)
    return json_response(payload, status=status)

