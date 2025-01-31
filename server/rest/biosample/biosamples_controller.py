from flask_restful import Resource
from flask import Response, request
import json
from . import biosamples_service
from flask_jwt_extended import jwt_required
from wrappers.admin import admin_required

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

class BioSamplesApi(Resource):

    def get(self):
        response, mimetype = biosamples_service.get_biosamples(request.args)
        return Response(response,mimetype=mimetype, status=200)
    
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
