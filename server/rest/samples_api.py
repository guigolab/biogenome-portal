from flask import Response, request
from db.models import  SecondaryOrganism
from flask_restful import Resource
from errors import NotFound,SchemaValidationError,RecordAlreadyExistError
from services import sample_service
import services.submission_service as service
from flask_jwt_extended import jwt_required
from mongoengine.queryset.visitor import Q
from flask import current_app as app
from utils.constants import SamplePipeline
import json

#CRUD operations on sample
class SamplesApi(Resource):

    def get(self,accession=None):
        sample = SecondaryOrganism.objects((Q(accession=accession) | Q(sample_unique_name=accession)))
        if len(sample) > 0:
            result = sample.aggregate(*SamplePipeline).next()
            return Response(json.dumps(result),mimetype="application/json", status=200)
        else:
            raise NotFound

    @jwt_required()
    def delete(self):
        if 'ids' in request.args.keys():
            ids = request.args['ids'].split(',')
            resp = sample_service.delete_samples(ids)
            return Response(json.dumps(resp),mimetype="application/json", status=200)
        else:
            raise SchemaValidationError
        # sample = SecondaryOrganism.objects((Q(accession=accession) | Q(sample_unique_name=accession)))
        # if len(sample) > 0:
        #     sample_service.delete_sample(sample.first())
        # else:


    @jwt_required()
    def put(self,accession):
        data = request.json if request.is_json else request.form
        sample = SecondaryOrganism.objects((Q(accession=accession) | Q(sample_unique_name=accession))).first()
        if not sample:
            raise NotFound
        else:
            sample.update(**data)
        if sample.accession:
            id = sample.accession
        else:
            id = sample.sample_unique_name
        return Response(json.dumps(f'sample with id {id} has been saved'),mimetype="application/json", status=204)
		#update sample


    @jwt_required()
    def post(self):
        ## TODO add metadata validation for different clients
        # SecondaryOrganism._get_collection().drop_index('accession_1')
        data = request.json if request.is_json else request.form
        app.logger.info(data)
        if all (k in data.keys() for k in ("taxid","sample_unique_name")):
            sample_unique_name= data['sample_unique_name']
            if len(SecondaryOrganism.objects(sample_unique_name=sample_unique_name)) > 0:
                raise RecordAlreadyExistError
            else:
                sample = service.create_sample(data)
                return Response(json.dumps(f'sample with id {sample.sample_unique_name} has been saved'),mimetype="application/json", status=201)
        else:
            raise SchemaValidationError
   
