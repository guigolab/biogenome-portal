import services.organism_service as organism_service
from flask import Response, request
from db.models import  BioSample, Chromosome, GenomeBrowserData, Organism,TaxonNode
from flask_restful import Resource
from errors import NotFound
import json
from flask_jwt_extended import jwt_required
from utils.pipelines import OrganismPipeline
from flask import current_app as app


#TODO unit test this 
class OrganismsApi(Resource):
	def get(self):
		return Response(organism_service.get_organisms(**request.args),mimetype="application/json", status=200)

	#create organism
	@jwt_required()
	def post(self):
		data = request.json if request.is_json else request.form
		new_organism = organism_service.parse_organism_data(data)
		return Response(new_organism.to_json(),mimetype="application/json", status=201)

class OrganismApi(Resource):
	def get(self,taxid):
		organism_obj = Organism.objects(taxid=taxid)
		if not organism_obj.first():
			raise NotFound
		json_resp = next(organism_obj.aggregate(*OrganismPipeline))
		#parse bioprojects and lineage
		ordered_taxid_lineage = organism_obj.first().taxon_lineage
		lineage_from_model = json.loads(TaxonNode.objects(taxid__in=ordered_taxid_lineage).exclude('children').to_json())
		parsed_lineage = list()
		for l_taxid in ordered_taxid_lineage:
			parsed_lineage.append(next(f for f in lineage_from_model if f['taxid'] == l_taxid ))
		json_resp['taxon_lineage'] = list(reversed(parsed_lineage))
		#get genome browser tracks
		if json_resp['assemblies']:
			for ass in json_resp['assemblies']:
				if ass['chromosomes']:
					json_resp['chromosomes'] = json.loads(Chromosome.objects(accession_version__in=ass['chromosomes']).to_json())
			assembly_accessions = [ass['accession'] for ass in json_resp['assemblies']]
			genome_browser_data = GenomeBrowserData.objects(assembly_accession__in=assembly_accessions).to_json()
			json_resp['genome_browser_data'] = json.loads(genome_browser_data)
		return Response(json.dumps(json_resp, default=str),mimetype="application/json", status=200)

	##update organism
	@jwt_required()
	def put(self,taxid):
		data = request.json if request.is_json else request.form
		updated_organism = organism_service.parse_organism_data(data,taxid)
		return Response(updated_organism.to_json(),mimetype="application/json", status=201)
	
	@jwt_required()
	def delete(self,taxid):
		message = organism_service.delete_organism(taxid)
		return Response(json.dumps(message),mimetype="application/json", status=200)


