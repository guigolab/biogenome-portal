from flask import Response, request
from db.models import  SecondaryOrganism
from flask_restful import Resource
from errors import NotFound,SchemaValidationError
import services.submission_service as service
from flask_jwt_extended import jwt_required
from flask import current_app as app
from utils.constants import SamplePipeline
import json

#CRUD operations on sample
class SampleApi(Resource):
	def get(self,accession):
		sample = SecondaryOrganism.objects(accession=accession).aggregate(*SamplePipeline).next()
		if not sample:
			raise NotFound
		return Response(json.dumps(sample),mimetype="application/json", status=200)
	
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
        if request.is_json:
            data = request.json
        else:
            data = request.form
        if all (k in data.keys() for k in ("taxid","metadata")) and \
            'sample_unique_name' in data['metadata'].keys() and \
                not SecondaryOrganism.objects(sample_unique_name=data['metadata']['sample_unique_name']).first():
            service.create_data(data, localSource=True)
        else:
            raise SchemaValidationError
		#update sample
	
	# @jwt_required()
	# def delete(self):

	
		# if not sample:
		# 	raise NotFound
##endpoint to retrieve checklist fields
