from . import organisms_service
from flask import Response, request
from flask_restful import Resource
import json
from flask_jwt_extended import jwt_required
from wrappers import organism_access, admin
from db.models import Organism
from rest.common.resource_mixins import json_message, read_payload
from rest.common.service_utils import get_or_404


class OrganismApi(Resource):
	def get(self, taxid):
		organism_obj = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
		return Response(organism_obj.to_json(),mimetype="application/json", status=200)

	@jwt_required()
	@organism_access.organism_access_required()
	def put(self,taxid):
		data = read_payload(request)
		message = organisms_service.update_organism(data,taxid)
		return json_message("Organism updated", status=200, taxid=message)
	
	@jwt_required()
	@admin.admin_required()
	def delete(self,taxid):
		message = organisms_service.delete_organism(taxid)
		return json_message(message, status=200)

class OrganismRelatedDataApi(Resource):
	def get(self, taxid, model):
		response, mimetype = organisms_service.get_organism_related_data(taxid, model, request.args)
		return Response(response,mimetype=mimetype, status=200)

class OrganismLineageApi(Resource):
	def get(self,taxid):
		organism_obj = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
		tree = organisms_service.map_organism_lineage(organism_obj.taxon_lineage)
		return Response(json.dumps(tree),mimetype="application/json", status=200)

class UnassignedOrganismsApi(Resource):
	@jwt_required()
	@admin.admin_required()
	def get(self):
		json, mimetype = organisms_service.get_unassigned_organisms(**request.args)
		return Response(json, mimetype=mimetype, status=200)

class OrganismsWithUser(Resource):
	@jwt_required()
	@admin.admin_required()
	def get(self):
		resp, mimetype = organisms_service.get_assigned_organisms(request.args)
		return Response(resp, mimetype=mimetype, status=200)

class OrganismToDeleteApi(Resource):

	@jwt_required()
	@organism_access.organism_access_required()
	def post(self, taxid):
		message = organisms_service.create_organism_to_delete(taxid)
		return json_message(message, status=201, taxid=taxid)

	@jwt_required()
	@admin.admin_required()
	def delete(self, taxid):
		message = organisms_service.delete_organism_to_delete(taxid)
		return json_message(message, status=201, taxid=taxid)

		## add organism to delete