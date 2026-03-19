from flask import Response, request
from flask_jwt_extended import jwt_required
from flask_restful import Resource
from wrappers.admin import admin_required
from db.models import ReadRun
from rest.common.resource_mixins import json_message
from rest.common.service_utils import get_or_404

from . import reads_service


class ReadApi(Resource):
    def get(self, run_accession=None):
        run_obj = get_or_404(
            ReadRun,
            f"Read run {run_accession} not found!",
            run_accession=run_accession,
        )
        return Response(run_obj.to_json(), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def delete(self, run_accession):
        deleted = reads_service.delete_read_run(run_accession)
        return json_message("Read run deleted", status=200, run_accession=deleted)


class ReadsImportApi(Resource):
    """POST import read runs from INSDC for an accession (experiment, sample, study, etc.)."""

    @jwt_required()
    @admin_required()
    def post(self, accession):
        message = reads_service.create_read_runs_from_ena_accession(accession)
        return json_message("Read runs imported", status=201, accession=message)


class ReadsByExperimentApi(Resource):
    def get(self, experiment_accession):
        response, mimetype = reads_service.get_read_runs_by_experiment(experiment_accession, request.args)
        return Response(response, mimetype=mimetype, status=200)


# --- Deprecated /api/experiments (410 Gone) ---


class ExperimentsQueryApi(Resource):
    def post(self):
        body, mimetype, status = reads_service.experiments_gone_response()
        return Response(body, mimetype=mimetype, status=status)


class ExperimentsApi(Resource):
    def get(self):
        body, mimetype, status = reads_service.experiments_gone_response()
        return Response(body, mimetype=mimetype, status=status)


class ExperimentApi(Resource):
    def get(self, accession=None):
        body, mimetype, status = reads_service.experiments_gone_response()
        return Response(body, mimetype=mimetype, status=status)

    @jwt_required()
    @admin_required()
    def post(self, accession):
        body, mimetype, status = reads_service.experiments_gone_response()
        return Response(body, mimetype=mimetype, status=status)

    @jwt_required()
    @admin_required()
    def delete(self, accession):
        body, mimetype, status = reads_service.experiments_gone_response()
        return Response(body, mimetype=mimetype, status=status)


class ReadsByExperiment(Resource):
    def get(self, accession):
        body, mimetype, status = reads_service.experiments_gone_response()
        return Response(body, mimetype=mimetype, status=status)
