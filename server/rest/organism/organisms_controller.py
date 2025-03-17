from . import organisms_service
from flask import Response, request
from flask_restful import Resource
import json
from flask_jwt_extended import jwt_required
from wrappers import data_manager, organism_access,admin

class OrganismsApi(Resource):
	def get(self):
		response, mimetype = organisms_service.get_organisms(request.args)
		return Response(response, mimetype=mimetype, status=200)
    
	@jwt_required()
	@data_manager.data_manager_required()
	def post(self):
		data = request.json if request.is_json else request.form
		message = organisms_service.create_organism(data)
		return Response(json.dumps(message),mimetype="application/json", status=201)

class OrganismApi(Resource):
	def get(self, taxid):
		organism_obj = organisms_service.get_organism(taxid)
		return Response(organism_obj.to_json(),mimetype="application/json", status=200)

	@jwt_required()
	@organism_access.organism_access_required()
	def put(self,taxid):
		data = request.json if request.is_json else request.form
		message = organisms_service.update_organism(data,taxid)
		return Response(json.dumps(message),mimetype="application/json", status=200)
	
	@jwt_required()
	@admin.admin_required()
	def delete(self,taxid):
		message = organisms_service.delete_organism(taxid)
		return Response(json.dumps(message),mimetype="application/json", status=200)

class OrganismRelatedDataApi(Resource):
	def get(self, taxid, model):
		items = organisms_service.get_organism_related_data(taxid, model)
		return Response(items.to_json(),mimetype="application/json", status=200)

class OrganismLineageApi(Resource):
	def get(self,taxid):
		organism_obj = organisms_service.get_organism(taxid)
		tree = organisms_service.map_organism_lineage(organism_obj.taxon_lineage)
		return Response(json.dumps(tree),mimetype="application/json", status=200)

class UnassignedOrganismsApi(Resource):
	def get(self):
		json, mimetype = organisms_service.get_unassigned_organisms(**request.args)
		return Response(json, mimetype=mimetype, status=200)

class OrganismToDeleteApi(Resource):
	@jwt_required()
	def get(self):
		json, mimetype = organisms_service.get_organisms_to_delete(**request.args)
		return Response(json, mimetype=mimetype, status=200)

	@jwt_required()
	@organism_access.organism_access_required()
	def post(self, taxid):
		message = organisms_service.create_organism_to_delete(taxid)
		return Response(json.dumps(message),mimetype="application/json", status=201)

	@jwt_required()
	@admin.admin_required()
	def delete(self, taxid):
		message = organisms_service.delete_organism_to_delete(taxid)
		return Response(json.dumps(message),mimetype="application/json", status=201)

		## add organism to delete