import json
import os

from flask import Response, request
from flask_jwt_extended import jwt_required
from flask_restful import Resource
from werkzeug.exceptions import BadRequest

from helpers.resource_mixins import get_task_status, read_payload
from helpers.upload_temp import save_upload_to_temp
from wrappers.admin import admin_required

from jobs.organism_tsv_import import validate_tsv_upload_file_size
from services import cronjob

TMP_DIR = os.getenv("TMP_DIR", "/tmp")


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


class OrganismsTsvImportApi(Resource):
    """
    POST /api/cronjob/import/organisms_tsv — multipart ``file`` (tab-separated TSV with ``taxid``).

    Admin only. Saves the upload under ``TMP_DIR`` (shared with Celery workers) and enqueues
    :func:`~jobs.organism_tsv_import.import_organisms_from_tsv_task` with ``tsv_path`` only.
    Optional form field: ``iucn_force`` = ``true`` / ``1``.
    """

    @jwt_required()
    @admin_required()
    def post(self):
        upload = request.files.get("file")
        if upload is None:
            raise BadRequest(description='Missing multipart field "file" (TSV upload).')

        iucn_raw = (request.form.get("iucn_force") or "").strip().lower()
        iucn_force = iucn_raw in ("1", "true", "yes", "on")

        try:
            with save_upload_to_temp(
                upload,
                TMP_DIR,
                filename_prefix="organism_tsv_import",
                suffix=".tsv",
            ) as stored_path:
                validate_tsv_upload_file_size(stored_path)
                result = cronjob.create_cronjob(
                    "helpers",
                    "import_organisms_from_tsv",
                    payload={
                        "kwargs": {
                            "tsv_path": stored_path,
                            "iucn_force": iucn_force,
                        }
                    },
                )
        except OSError as exc:
            raise BadRequest(description=f"Could not store upload: {exc}") from exc
        except ValueError as exc:
            raise BadRequest(description=str(exc)) from exc

        return Response(
            json.dumps(result, default=str),
            mimetype="application/json",
            status=201,
        )


# class ModelsUploadApi(Resource):
#     def post(self, model):

        
