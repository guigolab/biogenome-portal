from flask_restful import Resource
from flask import Response, request
import json
from . import biosamples_service
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required
from helpers import data as data_helper

class BioSamplesApi(Resource):
    def get(self):
        resp, mimetype = data_helper.get_items('biosamples', request.args)
        return Response(resp,mimetype=mimetype, status=200)
    
class BioSamplesQueryApi(Resource):
    def post(self):
        data = request.json if request.is_json else request.form
        resp, mimetype = data_helper.get_items('biosamples', data)
        return Response(resp, mimetype=mimetype, status=200)

class BioSampleApi(Resource):
    def get(self, accession):
        biosample_obj=biosamples_service.get_biosample(accession)
        return Response(biosample_obj.to_json(),mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
    def post(self,accession):
        message = biosamples_service.create_biosample_from_accession(accession)
        return Response(json.dumps(message), mimetype="application/json", status=201)
    
    @jwt_required()
    @admin_required()
    def delete(self,accession):
        deleted_accession = biosamples_service.delete_biosample(accession)
        return Response(json.dumps(deleted_accession), mimetype="application/json", status=200)


class ExperimentsByBiosample(Resource):
    def get(self, accession):
        experiments = biosamples_service.get_related_experiments(accession)
        return Response(experiments, mimetype="application/json", status=200)

class AssembliesByBiosample(Resource):
    def get(self, accession):
        assemblies = biosamples_service.get_related_assemblies(accession)
        return Response(assemblies, mimetype="application/json", status=200)

class SubSamplesApi(Resource):
    def get(self,accession):
        sub_samples = biosamples_service.get_related_sub_samples(accession)
        return Response(sub_samples, mimetype="application/json", status=200)


class BioSampleChecklist(Resource):
    def get(self):
        resp = biosamples_service.get_biosample_checklist()
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class BioSamplesSubmit(Resource):
    @jwt_required()
    def get(self):
        response, mimetype = biosamples_service.get_submitted_biosamples(request.args)
        return Response(response,mimetype=mimetype, status=200)

    @jwt_required()
    def post(self):
        print(request.json)
        data = request.json if request.is_json else request.form
        json_resp, code = biosamples_service.submit_sample(data)
        return Response(json.dumps(json_resp), mimetype="application/json", status=code)

class BioSampleSubmit(Resource):
    @jwt_required()
    def get(self, accession):
        response = biosamples_service.get_submitted_sample(accession)
        return Response(response.to_json(),mimetype="application/json", status=200)

    # @jwt_required()
    # def put(self):
    #     data = request.json
    #     json_resp, code = biosamples_service.submit_sample(data, request.cookies)
    #     return Response(json.dumps(json_resp), mimetype="application/json", status=code)





# class BioSampleSubmit(Resource):
#     def get(self):
