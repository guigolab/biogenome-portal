from flask import Response, request
from flask_jwt_extended import jwt_required
from flask_restful import Resource
from wrappers.admin import admin_required
from db.model import ReadRun
from helpers.resource_mixins import document_json_response, json_message
from helpers.service_utils import get_or_404

from services import read_experiments, reads


class ReadExperimentsApi(Resource):
    """GET paginated experiment_accession + title groups for read-run filters (catalog query string)."""

    def get(self):
        json_resp, status = read_experiments.get_read_experiment_groups(request.args)
        return Response(json_resp, mimetype="application/json", status=status)


class ReadApi(Resource):
    """GET/DELETE by run accession; POST imports all read runs from ENA filereport for the given accession."""

    def get(self, accession=None):
        run_obj = get_or_404(
            ReadRun,
            f"Read run {accession} not found!",
            run_accession=accession,
        )
        return document_json_response(run_obj)

    @admin_required()
    @jwt_required()
    def post(self, accession):
        message = reads.create_read_runs_from_ena_accession(accession)
        return json_message("Read runs imported", status=201, accession=message)

    @admin_required()
    @jwt_required()
    def delete(self, accession):
        deleted = reads.delete_read_run(accession)
        return json_message("Read run deleted", status=200, run_accession=deleted)
