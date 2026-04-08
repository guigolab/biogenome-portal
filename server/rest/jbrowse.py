from flask import request
from flask_restful import Resource

from helpers.resource_mixins import json_response
from services import jbrowse as jbrowse_service


class JBrowseSessionsApi(Resource):
    def get(self):
        payload = jbrowse_service.get_jbrowse_sessions(request.args)
        return json_response(payload, status=200)


class JBrowseAssemblyContextApi(Resource):
    """Assembly + browser-normalized chromosomes + annotations for the embedded JBrowse UI."""

    def get(self, accession: str):
        payload = jbrowse_service.get_genome_browser_context(accession)
        return json_response(payload, status=200)
