from flask_restful import Resource
from flask import Response, request
import json
from . import biosamples_service
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from db.models import BioSample, BioSampleSubmission
from rest.common.resource_mixins import (
    json_message,
    json_response,
    read_payload,
)
from rest.common.service_utils import get_or_404

class BioSampleApi(Resource):
    def get(self, accession):
        biosample_obj = get_or_404(BioSample, f"BioSample {accession} not found!", accession=accession)
        return Response(biosample_obj.to_json(),mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self,accession):
        message = biosamples_service.create_biosample_from_accession(accession)
        return json_message(message, status=201, accession=accession)
    
    @jwt_required()
    @admin_required()
    def delete(self,accession):
        deleted_accession = biosamples_service.delete_biosample(accession)
        return json_message("BioSample deleted", status=200, accession=deleted_accession)


class ReadsByBiosample(Resource):
    def get(self, accession):
        response, mimetype = biosamples_service.get_related_reads(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)

class AssembliesByBiosample(Resource):
    def get(self, accession):
        response, mimetype = biosamples_service.get_related_assemblies(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)

class SubSamplesApi(Resource):
    def get(self,accession):
        response, mimetype = biosamples_service.get_related_sub_samples(accession, request.args)
        return Response(response, mimetype=mimetype, status=200)


class BioSampleChecklist(Resource):
    def get(self):
        resp = biosamples_service.get_biosample_checklist()
        return json_response(resp, status=200)

class BioSamplesSubmit(Resource):
    @jwt_required()
    def get(self):
        response, mimetype = biosamples_service.get_submitted_biosamples(request.args)
        return Response(response,mimetype=mimetype, status=200)

    @jwt_required()
    def post(self):
        print(request.json)
        data = read_payload(request)
        json_resp, code = biosamples_service.submit_sample(data)
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
        return Response(response.to_json(),mimetype="application/json", status=200)

    # @jwt_required()
    # def put(self):
    #     data = request.json
    #     json_resp, code = biosamples_service.submit_sample(data, request.cookies)
    #     return Response(json.dumps(json_resp), mimetype="application/json", status=code)





# class BioSampleSubmit(Resource):
#     def get(self):
