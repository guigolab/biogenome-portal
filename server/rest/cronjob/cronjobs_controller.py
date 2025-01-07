from flask_restful import Resource
from flask import Response
from flask_jwt_extended import jwt_required
from . import cronjob_service
from wrappers.admin import admin_required
from helpers import data as data_helper
import json

## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        cronjobs = cronjob_service.get_cronjobs()
        return Response(json.dumps(cronjobs), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self, model, action):
        message = cronjob_service.create_cronjob(model, action)
        return Response(json.dumps(message), mimetype="application/json", status=201)

class TaskStatusAPI(Resource):
    def get(self, task_id):
        return data_helper.get_task_status(task_id)