from flask import Response, request
from db.models import  SecondaryOrganism
from flask_restful import Resource
from errors import NotFound,SchemaValidationError,RecordAlreadyExistError
import services.submission_service as service
from flask_jwt_extended import jwt_required
from mongoengine.queryset.visitor import Q
from flask import current_app as app
from utils.constants import SamplePipeline
import json

#CRUD operations on sample
class SampleApi(Resource):

    def get(self,accession):
        sample = SecondaryOrganism.objects((Q(accession=accession) | Q(sample_unique_name=accession)))
        if len(sample) > 0:
            result = sample.aggregate(*SamplePipeline).next()
        else:
            raise NotFound
        return Response(json.dumps(result),mimetype="application/json", status=200)

    @jwt_required
    def put(self,accession):
        params = request.args
        sample = SecondaryOrganism.objects(accession=accession)
        if not sample:
            raise NotFound
		#update sample

class SamplesApi(Resource):

    def get(self,accession):
        sample = SecondaryOrganism.objects(accession=accession).aggregate(*SamplePipeline).next()
        if not sample:
            raise NotFound
        return Response(json.dumps(sample),mimetype="application/json", status=200)

    @jwt_required()
    def post(self):
        ## TODO add metadata validation for different clients
        # SecondaryOrganism._get_collection().drop_index('accession_1')
        data = request.json if request.is_json else request.form
        if all (k in data.keys() for k in ("taxid","metadata")) and 'sample_unique_name' in data['metadata'].keys():
            specimen_id= data['metadata']['sample_unique_name']
            if SecondaryOrganism.objects(specimen_id=specimen_id).first():
                raise RecordAlreadyExistError
            else:
                sample = service.create_sample(data)
                return Response(json.dumps(f'sample with id {sample.sample_unique_name} has been saved'),mimetype="application/json", status=200)
        else:
            raise SchemaValidationError
   

		#update sample
	
	# @jwt_required()
	# def delete(self):

	
		# if not sample:
		# 	raise NotFound
##endpoint to retrieve checklist fields
