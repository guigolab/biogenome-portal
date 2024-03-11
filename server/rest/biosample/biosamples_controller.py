from flask_restful import Resource
from flask import Response, request
import json
from db.models import BioSample,Experiment,Assembly
from . import biosamples_service
from errors import NotFound
from flask_jwt_extended import jwt_required
from ..utils import wrappers

FIELDS_TO_EXCLUDE = ['id','created','last_check']


class BioSampleApi(Resource):
    def get(self, accession):
        biosample_obj=BioSample.objects(accession=accession).exclude('id').first()
        if not biosample_obj:
            raise NotFound
        return Response(biosample_obj.to_json(),mimetype="application/json", status=200)

    @jwt_required()
    @wrappers.admin_required()
    def post(self,accession):
        message, status = biosamples_service.create_biosample_from_accession(accession)
        return Response(json.dumps(message), mimetype="application/json", status=status)
    
    @jwt_required()
    @wrappers.admin_required()
    def delete(self,accession):
        deleted_accession = biosamples_service.delete_biosample(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)

class BioSamplesApi(Resource):

    def get(self):
        total, data = biosamples_service.get_biosamples(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

class ExperimentsByBiosample(Resource):
    def get(self, accession):
        biosample = BioSample.objects(accession=accession).first()
        if not biosample:
            raise NotFound
        experiments = Experiment.objects(sample_accession=accession).exclude('id', 'created')
        return Response(experiments.to_json(), mimetype="application/json", status=200)

class AssembliesByBiosample(Resource):
    def get(self, accession):
        biosample = BioSample.objects(accession=accession).first()
        if not biosample:
            raise NotFound
        assemblies = Assembly.objects(sample_accession=accession).exclude('id', 'created')
        return Response(assemblies.to_json(), mimetype="application/json", status=200)
