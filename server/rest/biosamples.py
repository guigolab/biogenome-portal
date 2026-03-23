from flask_restful import Resource
from flask import Response, request
import json
from services import biosamples
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from db.model import BioSample, BioSampleSubmission
from helpers.resource_mixins import (
    document_json_response,
    json_message,
    json_response,
    read_payload,
)
from helpers.service_utils import get_or_404

class BioSampleApi(Resource):
    def get(self, accession):
        biosample_obj = get_or_404(BioSample, f"BioSample {accession} not found!", accession=accession)
        return document_json_response(biosample_obj)

    @jwt_required()
    @admin_required()
    def post(self,accession):
        message = biosamples.create_biosample_from_accession(accession)
        return json_message(message, status=201, accession=accession)
    
    @jwt_required()
    @admin_required()
    def delete(self,accession):
        deleted_accession = biosamples.delete_biosample(accession)
        return json_message("BioSample deleted", status=200, accession=deleted_accession)


class ReadsByBiosample(Resource):
    def get(self, accession):
        response, mimetype = biosamples.get_related_reads(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)

class AssembliesByBiosample(Resource):
    def get(self, accession):
        response, mimetype = biosamples.get_related_assemblies(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)

class SubSamplesApi(Resource):
    def get(self,accession):
        response, mimetype = biosamples.get_related_sub_samples(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)


class BioSampleChecklist(Resource):
    def get(self):
        resp = biosamples.get_biosample_checklist()
        return json_response(resp, status=200)

class BioSamplesSubmit(Resource):
    @jwt_required()
    def get(self):
        response, mimetype = biosamples.get_submitted_biosamples(request.args)
        return Response(response,mimetype=mimetype, status=200)

    @jwt_required()
    def post(self):
        data = read_payload(request)
        json_resp, code = biosamples.submit_sample(data)
        if isinstance(json_resp, str):
            return json_message(json_resp, status=code)
        return json_response(json_resp, status=code)

class BioSampleSubmit(Resource):
    @jwt_required()
    def get(self, accession):
        response = get_or_404(
            BioSampleSubmission,
            f"biosample with accession {accession} not found",
            accession=accession,
        )
        return document_json_response(response)

