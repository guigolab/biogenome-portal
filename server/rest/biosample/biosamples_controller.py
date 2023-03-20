from flask_restful import Resource
from flask import Response, request
import json
from db.models import BioSample,Experiment,Assembly,BioProject
from . import biosamples_service
from errors import NotFound
from flask_jwt_extended import jwt_required


FIELDS_TO_EXCLUDE = ['id','created','last_check']


class BioSampleApi(Resource):
    def get(self, accession):
        biosample_obj=BioSample.objects(accession=accession).exclude('id').first()
        print(biosample_obj.location)
        if not biosample_obj:
            raise NotFound
        return Response(biosample_obj.to_json(),mimetype="application/json", status=200)

    @jwt_required()
    def post(self,accession):
        response = biosamples_service.create_biosample_from_accession(accession)
        return Response(json.dumps(response['message']), mimetype="application/json", status=response['status'])

    @jwt_required()
    def delete(self,accession):
        deleted_accession = biosamples_service.delete_biosample(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)

class BioSamplesApi(Resource):

    def get(self):
        total, data = biosamples_service.get_biosamples(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)

class BioSampleRelatedDataApi(Resource):

    def get(self, accession, model):
        biosample_obj=BioSample.objects(accession=accession).exclude('id').first()
        if not biosample_obj or not model in ['sub_samples','experiments','assemblies']:
            raise NotFound
        if model == 'sub_samples':
            items = BioSample.objects(accession__in=biosample_obj.sub_samples)
        elif model == 'experiments':
            items = Experiment.objects(metadata__sample_accession=biosample_obj.accession)
        else:
            items = Assembly.objects(sample_accession=biosample_obj.accession)
        return Response(items.to_json(),mimetype="application/json", status=200)

class BioSampleBioProjectsApi(Resource):
    def get(self, accession):
        biosample_obj=BioSample.objects(accession=accession).exclude('id').first()
        if not biosample_obj:
            raise NotFound
        bioprojects = BioProject.objects(accession__in=biosample_obj.bioprojects)
        return Response(bioprojects.to_json(),mimetype="application/json", status=200)

        