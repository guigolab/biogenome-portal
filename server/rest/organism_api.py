import services.organism_service as organism_service
from flask import Response, request
from db.models import  Organism,TaxonNode
from flask_restful import Resource
from errors import NotFound, SchemaValidationError
import json
from flask_jwt_extended import jwt_required
from utils.pipelines import OrganismPipeline
from flask import current_app as app


#TODO unit test this 
class OrganismsApi(Resource):
	def get(self):
		return Response(organism_service.get_organisms(**request.args),mimetype="application/json", status=200)

	#create organism
	def post(self):
		data = request.json if request.is_json else request.form
		new_organism = organism_service.create_organism_from_data(data)
		return Response(new_organism.to_json(),mimetype="application/json", status=201)

class OrganismApi(Resource):
	def get(self,taxid):
		organism_obj = Organism.objects(taxid=taxid)
		if not organism_obj.first():
			raise NotFound
		json_resp = next(organism_obj.aggregate(*OrganismPipeline))
		##parse bioprojects and lineage
		ordered_taxid_lineage = organism_obj.first().taxon_lineage
		lineage_from_model = json.loads(TaxonNode.objects(taxid__in=ordered_taxid_lineage).exclude('children').to_json())
		#order lineage TODO FIX THIS
		parsed_lineage = list()
		for taxid in ordered_taxid_lineage:
			parsed_lineage.append(next(f for f in lineage_from_model if f['taxid'] == taxid ))
		json_resp['taxon_lineage'] = list(reversed(parsed_lineage))
		return Response(json.dumps(json_resp, default=str),mimetype="application/json", status=200)

	##update organism
	def put(self,taxid):
		data = request.json if request.is_json else request.form
		updated_organism = organism_service.update_organism_from_data(data,taxid)
		return Response(updated_organism.to_json(),mimetype="application/json", status=201)
	
	def delete(self,taxid):
		message = organism_service.delete_organism(taxid)
		return Response(json.dumps(message),mimetype="application/json", status=200)


	# @jwt_required()
	# def post(self,name):
	# 	organism = Organism.objects(organism=name).first()
	# 	if not organism:
	# 		raise NotFound
	# 	if request.form:
	# 		if 'delete_image' in request.form.keys():
	# 			organism.image.delete()
	# 		if 'image' in request.files.keys():
	# 			if organism.image:
	# 				organism.image.replace(request.files['image'], content_type = 'image/jpeg')
	# 			else:
	# 				organism.image.put(request.files['image'], content_type = 'image/jpeg')
	# 		if 'image_url' in request.form.keys():
	# 			organism.image_url = request.form['image_url']
	# 		if 'common_name' in request.form.keys():
	# 			common_names = request.form['common_name'].split(',')
	# 			organism.common_name = (common_names)
	# 		organism.save()
	# 	else:
	# 		raise SchemaValidationError	# organism.common_name.extend


