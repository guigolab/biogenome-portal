import services.search_service as service
from flask import Response, request
from db.models import Organism, SecondaryOrganism,Assembly
from flask_restful import Resource
from mongoengine.errors import DoesNotExist
from errors import NotFound
import services.common_functions as common
from flask import current_app as app
import json
# import json

class OrganismsApi(Resource):
	def get(self):
		try:
			return Response(service.default_query_params(request.args,Organism),mimetype="application/json", status=200)
		except DoesNotExist:
			raise NotFound

class OrganismsSearchApi(Resource):
	def get(self):
		try:
			app.logger.info(Assembly.objects().first())
			return Response(service.full_text_search(request.args,Organism),mimetype="application/json", status=200)
		except DoesNotExist:
			raise NotFound

class OrganismApi(Resource):
	def get(self,name):
		try:
			organism = Organism.objects(organism=name).first()
			response = json.loads(organism.to_json())
			response['taxon_lineage'] = common.fetch_lazy_reference(organism.taxon_lineage)
			response['records'] = common.fetch_lazy_reference(organism.records)
			response['assemblies'] = common.fetch_lazy_reference(organism.assemblies)
			response['experiments'] = common.fetch_lazy_reference(organism.experiments)
			return Response(json.dumps(response),mimetype="application/json", status=200)
		except DoesNotExist:
			raise NotFound

class SampleApi(Resource):
	def get(self,accession):
		try:
			sample = SecondaryOrganism.objects(accession=accession).first()
			response = json.loads(sample.to_json())
			if len(response['specimens']) > 0:
				response['specimens'] = common.fetch_lazy_reference(sample.specimens)
			if len(response['experiments']) > 0:	
				response['experiments'] = common.fetch_lazy_reference(sample.experiments)
			if len(response['assemblies']):
				response['assemblies'] = common.fetch_lazy_reference(sample.assemblies)
			return Response(json.dumps(response),mimetype="application/json", status=200)
		except DoesNotExist:
			raise NotFound

##endpoint to retrieve checklist fields
