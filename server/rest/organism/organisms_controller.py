from . import organisms_service
from flask import Response, request
from db.models import Organism
from flask_restful import Resource
from errors import NotFound
import json
from flask_jwt_extended import jwt_required
from wrappers import data_manager, organism_access

class OrganismsApi(Resource):

	def get(self):
		# cronjob_service.create_cronjob('import_assemblies')
		response, mimetype, status = organisms_service.get_organisms(request.args)
		return Response(response, mimetype=mimetype, status=status)
    
	@jwt_required()
	@data_manager.data_manager_required()
	def post(self):
		data = request.json if request.is_json else request.form
		message, status = organisms_service.create_organism(data)
		return Response(json.dumps(message),mimetype="application/json", status=status)

class OrganismApi(Resource):
	def get(self, taxid):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj:
			raise NotFound
		return Response(organism_obj.to_json(),mimetype="application/json", status=200)

	@jwt_required()
	@organism_access.organism_access_required()
	def put(self,taxid):
		data = request.json if request.is_json else request.form
		message, status = organisms_service.update_organism(data,taxid)
		return Response(json.dumps(message),mimetype="application/json", status=status)
	
	@jwt_required()
	@organism_access.organism_access_required()
	def delete(self,taxid):
		message, status = organisms_service.delete_organism(taxid)
		return Response(json.dumps(message),mimetype="application/json", status=status)

class OrganismRelatedDataApi(Resource):
	def get(self, taxid, model):
		items = organisms_service.get_organism_related_data(taxid, model)
		return Response(items.to_json(),mimetype="application/json", status=200)


class OrganismLineageApi(Resource):
	def get(self,taxid):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj:
			raise NotFound
		tree = organisms_service.map_organism_lineage(organism_obj.taxon_lineage)
		return Response(json.dumps(tree),mimetype="application/json", status=200)
	