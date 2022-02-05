import services.search_service as service
from flask import Response, request
from db.models import Organism, SecondaryOrganism
from flask_restful import Resource
from mongoengine.errors import DoesNotExist
from errors import NotFound
from flask_jwt_extended import jwt_required
from flask import current_app as app


import json
from constants import OrganismPipeline, SamplePipeline


class OrganismsApi(Resource):
	def get(self):
		return Response(service.default_query_params(request.args,Organism),mimetype="application/json", status=200)


class OrganismsSearchApi(Resource):
	def get(self):
		return Response(service.full_text_search(request.args,Organism),mimetype="application/json", status=200)



class OrganismApi(Resource):
	def get(self,name):
		organism = Organism.objects(organism=name).aggregate(*OrganismPipeline).next()
		if not organism:
			raise NotFound
		return Response(json.dumps(organism),mimetype="application/json", status=200)

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

	#deleting sample triggers taxon and organism update (they'll be deleted if containing this as the only sample)
	def delete(self,accession):
		sample = SecondaryOrganism.objects(accession=accession)
		if not sample:
			raise NotFound
		#delete sample

class SamplesApi(Resource):
	def get(self,accession):
		sample = SecondaryOrganism.objects(accession=accession).aggregate(*SamplePipeline).next()
		if not sample:
			raise NotFound
		return Response(json.dumps(sample),mimetype="application/json", status=200)

	@jwt_required()
	def post(self):
		app.logger.info('Valid')
		if request.is_json:
			data = request.json
		else:
			data = request.form
		app.logger.info(data)
		#update sample



	def delete(self,accession):
		sample = SecondaryOrganism.objects(accession=accession)
		if not sample:
			raise NotFound
##endpoint to retrieve checklist fields
