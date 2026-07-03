from services import organisms
from services.organism_audit_log import (
	search_organism_audit_logs,
	search_organism_audit_logs_for_taxid,
)
from flask import Response, request
from flask_restful import Resource
import json
from flask_jwt_extended import get_jwt, jwt_required, verify_jwt_in_request
from werkzeug.exceptions import BadRequest
from wrappers import organism_access, admin
from db.model import Organism
from helpers.resource_mixins import document_json_response, dump_json, json_message, read_payload
from helpers.service_utils import get_or_404


class OrganismApi(Resource):
	def get(self, taxid):
		organism_obj = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
		return document_json_response(organism_obj)

	@jwt_required()
	@organism_access.organism_access_required()
	def put(self,taxid):
		try:
			data = read_payload(request)
			message = organisms.update_organism(data,taxid)
			return json_message("Organism updated", status=200, taxid=message)
		except BadRequest as e:
			return json_message(e.description or "Invalid request", status=400, taxid=taxid)

	@jwt_required()
	@organism_access.organism_access_required()
	def patch(self, taxid):
		try:
			data = read_payload(request)
			updated_taxid, field = organisms.patch_organism(data, taxid)
			return json_message("Organism field updated", status=200, taxid=updated_taxid, field=field)
		except BadRequest as e:
			return json_message(e.description or "Invalid request", status=400, taxid=taxid)
	
	@jwt_required()
	@admin.admin_required()
	def delete(self,taxid):
		message = organisms.delete_organism(taxid)
		return json_message(message, status=200)

class OrganismRelatedDataApi(Resource):
	def get(self, taxid, model):
		response, mimetype = organisms.get_organism_related_data(taxid, model, request.args)
		return Response(response,mimetype=mimetype, status=200)

class OrganismLineageApi(Resource):
	def get(self,taxid):
		organism_obj = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
		tree = organisms.map_organism_lineage(organism_obj.taxon_lineage)
		return Response(json.dumps(tree),mimetype="application/json", status=200)

class OrganismAuditLogsApi(Resource):
	"""GET /api/organisms/audit_logs — admin search over organism CMS audit rows."""

	@jwt_required()
	@admin.admin_required()
	def get(self):
		payload = search_organism_audit_logs(dict(request.args))
		return Response(
			dump_json(payload),
			mimetype="application/json",
			status=200,
		)


class OrganismTaxidAuditLogsApi(Resource):
	"""GET /api/organisms/<taxid>/audit_logs — species-scoped audit history."""

	@jwt_required()
	@organism_access.organism_access_required()
	def get(self, taxid):
		payload = search_organism_audit_logs_for_taxid(str(taxid), dict(request.args))
		return Response(
			dump_json(payload),
			mimetype="application/json",
			status=200,
		)


class UnassignedOrganismsApi(Resource):
	@jwt_required()
	@admin.admin_required()
	def get(self):
		json, mimetype = organisms.get_unassigned_organisms(**request.args)
		return Response(json, mimetype=mimetype, status=200)

class OrganismsWithUser(Resource):
	@jwt_required()
	@admin.admin_required()
	def get(self):
		resp, mimetype = organisms.get_assigned_organisms(request.args)
		return Response(resp, mimetype=mimetype, status=200)

class AllOrganismsWithUser(Resource):
	@jwt_required()
	@admin.admin_required()
	def get(self):
		resp, mimetype = organisms.get_all_organisms_with_users(request.args)
		return Response(resp, mimetype=mimetype, status=200)

class OrganismSuggestImagesApi(Resource):
    """POST /api/organisms/suggest_external_images — enqueue image suggestion task."""

    def post(self):
        verify_jwt_in_request()
        claims = get_jwt()
        role = claims.get("role")
        if role not in ("DataManager", "Admin"):
            return json_message("Data managers only!", status=403)

        body = read_payload(request) or {}
        scientific_name = (body.get("scientific_name") or "").strip()
        if not scientific_name:
            return json_message("scientific_name is required", status=400)
        max_images = int(body.get("max_images") or 12)

        from jobs.organism_images import suggest_external_organism_images_task

        result = suggest_external_organism_images_task.delay(
            scientific_name=scientific_name,
            max_images=max_images,
        )
        return Response(
            json.dumps(
                {
                    "task_id": result.id,
                    "status_url": f"/api/tasks/{result.id}",
                    "message": f"Image suggestion job {result.id} launched for {scientific_name!r}",
                }
            ),
            mimetype="application/json",
            status=201,
        )


class OrganismToDeleteApi(Resource):

	@jwt_required()
	@organism_access.organism_access_required()
	def post(self, taxid):
		message = organisms.create_organism_to_delete(taxid)
		return json_message(message, status=201, taxid=taxid)

	@jwt_required()
	@admin.admin_required()
	def delete(self, taxid):
		message = organisms.delete_organism_to_delete(taxid)
		return json_message(message, status=200, taxid=taxid)

		## add organism to delete
