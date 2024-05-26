from flask_restful import Resource
from flask import Response
from flask_jwt_extended import jwt_required
from . import cronjob_service
from wrappers.admin import admin_required
import json

## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        cronjobs = cronjob_service.get_cronjobs()
        return Response(json.dumps(cronjobs), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self, model):
        message, code = cronjob_service.create_cronjob(model)
        return Response(json.dumps(message), mimetype="application/json", status=code)

    @jwt_required()
    @admin_required()
    def delete(self, model):
        message, status = cronjob_service.delete_cronjob(model)
        return Response(message, mimetype="application/json", status=status)
