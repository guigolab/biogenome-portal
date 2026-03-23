from flask_jwt_extended import jwt_required
from flask_restful import Resource
from wrappers.admin import admin_required
from db.model import ReadRun
from helpers.resource_mixins import document_json_response, json_message
from helpers.service_utils import get_or_404

from services import reads


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
