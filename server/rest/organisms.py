import services.search_service as service
from flask import Response, request
from db.models import Organism
from flask_restful import Resource
from errors import NotFound
import json
from utils.constants import OrganismPipeline
from utils.utils import sort_lineage


class OrganismsApi(Resource):
	def get(self):
		return Response(service.default_query_params(request.args,Organism),mimetype="application/json", status=200)

class OrganismsSearchApi(Resource):
	def get(self):
		return Response(service.full_text_search(request.args,Organism),mimetype="application/json", status=200)

class OrganismApi(Resource):
	def get(self,name):
		organism = Organism.objects(organism=name).aggregate(*OrganismPipeline).next()
		sort_lineage(organism['taxon_lineage']) #sort lineage (aggregation pipeline returns unordered list)
		if not organism:
			raise NotFound
		return Response(json.dumps(organism, default='str'),mimetype="application/json", status=200)

