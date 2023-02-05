from . import organisms_service
from flask import Response, request
from db.models import Organism
from flask_restful import Resource
from errors import NotFound
import json
from flask_jwt_extended import jwt_required

class OrganismsApi(Resource):

    def get(self):
        total, data = organisms_service.get_organisms(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)
    
    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        new_organism = organisms_service.parse_organism_data(data)
        return Response(new_organism.to_json(),mimetype="application/json", status=201)

class OrganismApi(Resource):
	def get(self, taxid):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj:
			raise NotFound
		return Response(organism_obj.to_json(),mimetype="application/json", status=200)

	##update organism
	@jwt_required()
	def put(self,taxid):
		data = request.json if request.is_json else request.form
		updated_organism = organisms_service.parse_organism_data(data,taxid)
		return Response(updated_organism.to_json(),mimetype="application/json", status=201)
	
	@jwt_required()
	def delete(self,taxid):
		message = organisms_service.delete_organism(taxid)
		return Response(json.dumps(message),mimetype="application/json", status=201)


