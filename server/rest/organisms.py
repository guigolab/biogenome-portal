import services.search_service as service
import services.organisms_service as organism_service
from flask import Response, request
from db.models import Organism
from flask_restful import Resource
from errors import NotFound, SchemaValidationError
import json
from flask_jwt_extended import jwt_required
from utils.constants import OrganismPipeline
from utils.utils import sort_lineage
from flask import current_app as app



class OrganismsApi(Resource):
	def get(self):
		return Response(service.default_query_params(request.args,Organism),mimetype="application/json", status=200)
	
	@jwt_required()
	def delete(self):
		if 'tax_ids' in request.args.keys() and len(request.args['tax_ids'].split(',')) > 0:
			taxids = request.args['tax_ids'].split(',')
			deleted_taxons = organism_service.delete_organisms(taxids)
			return Response(json.dumps(deleted_taxons),mimetype="application/json", status=200)
		else:
			raise SchemaValidationError

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

