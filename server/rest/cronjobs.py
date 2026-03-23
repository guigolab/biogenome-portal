import json

from flask import Response
from flask_jwt_extended import jwt_required
from flask_restful import Resource

from helpers.resource_mixins import get_task_status, read_payload
from wrappers.admin import admin_required

from services import cronjob


class CronJobApi(Resource):
    """
    GET  /api/cronjob — worker queue snapshot + optional registry for UIs that poll.
    POST /api/cronjob/<model>/<action> — enqueue a registered Celery job (admin).
    """
    @jwt_required()
    @admin_required()
    def get(self, model=None, action=None):
        # Same Resource is mounted on `/api/cronjob` and `/api/cronjob/<model>/<action>`.
        if model is not None or action is not None:
            return Response(
                json.dumps(
                    {
                        "error": "GET lists worker queues only. "
                        "Use POST /api/cronjob/<model>/<action> to enqueue a job.",
                    }
                ),
                mimetype="application/json",
                status=400,
            )
        snapshot = cronjob.get_cronjobs()
        snapshot["available_jobs"] = cronjob.list_job_routes()
        return Response(
            json.dumps(snapshot, default=str),
            mimetype="application/json",
            status=200,
        )

    @jwt_required()
    @admin_required()
    def post(self, model, action):
        body = read_payload()
        cron_payload = body if isinstance(body, dict) else {}
        result = cronjob.create_cronjob(model, action, payload=cron_payload)
        return Response(
            json.dumps(result, default=str),
            mimetype="application/json",
            status=201,
        )


class TaskStatusAPI(Resource):
    """GET /api/tasks/<task_id> — poll AsyncResult state (JSON, safe for any result type)."""

    def get(self, task_id):
        status = get_task_status(task_id)
        return Response(
            json.dumps(status, default=str),
            mimetype="application/json",
            status=200,
        )
    

# class ModelsUploadApi(Resource):
#     def post(self, model):

        
