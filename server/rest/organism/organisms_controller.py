from . import organisms_service
from flask import Response, request
from db.models import Organism,TaxonNode,BioProject,Assembly,BioSample,Experiment,LocalSample,GenomeAnnotation
from flask_restful import Resource
from errors import NotFound
import json
from flask_jwt_extended import jwt_required
from flask import current_app as app
import itertools


MODEL_LIST = {
    'assemblies':Assembly,
    'annotations':GenomeAnnotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'experiments':Experiment,
    'organisms':Organism,
    }

class OrganismsApi(Resource):

	def get(self):
		total, data = organisms_service.get_organisms(**request.args)
		json_resp = dict(total=total,data=list(data.as_pymongo()))
		return Response(json.dumps(json_resp), mimetype="application/json", status=200)
    
	# @jwt_required()
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
	# @jwt_required()
	def put(self,taxid):
		data = request.json if request.is_json else request.form
		updated_organism = organisms_service.parse_organism_data(data,taxid)
		return Response(updated_organism.to_json(),mimetype="application/json", status=201)
	
	# @jwt_required()
	def delete(self,taxid):
		organism = Organism.objects(taxid=taxid).first()
		name = organism.scientific_name
		if not organism:
			raise NotFound
		organism.delete()
		return Response(json.dumps(f'{name} and its related data have been deleted'),mimetype="application/json", status=201)

class OrganismRelatedDataApi(Resource):
	def get(self, taxid, model):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj or not model in MODEL_LIST.keys():
			raise NotFound
		items = organisms_service.get_organism_related_data(taxid, MODEL_LIST[model])
		return Response(items.to_json(),mimetype="application/json", status=200)


class OrganismLineageApi(Resource):
	def get(self,taxid):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj:
			raise NotFound
		ordered_taxid_lineage = organism_obj.taxon_lineage
		lineage_from_model = TaxonNode.objects(taxid__in=ordered_taxid_lineage).exclude('id','children').as_pymongo()
		parsed_lineage = list()
		for l_taxid in ordered_taxid_lineage:
			parsed_lineage.append(next(f for f in lineage_from_model if f['taxid'] == l_taxid ))
		taxon_lineage = list(reversed(parsed_lineage))
		return Response(json.dumps(taxon_lineage),mimetype="application/json", status=200)

class OrganismBioProjectsApi(Resource):
	def get(self, taxid):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj:
			raise NotFound
		bioprojects = BioProject.objects(accession__in=organism_obj.bioprojects)		
		return Response(bioprojects.to_json(),mimetype="application/json", status=200)

class OrganismSankeyDataApi(Resource):
	def get(self, taxid):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj:
			raise NotFound
		tree = dict(name=organism_obj.scientific_name, taxid=organism_obj.taxid, children=list())
		tree['value'] = 10
		biosamples = BioSample.objects(taxid=organism_obj.taxid)
		if biosamples:
			biosamples_children = dict(name='BioSamples', children=list())
			sub_samples = list(itertools.chain(*[bs.sub_samples for bs in biosamples]))
			for biosample in biosamples:
				if biosample.accession in sub_samples:
					continue
				sample_obj = dict(name=biosample.accession,category='biosamples')
				if biosample.sub_samples:
					sample_obj['children'] = list()
					for sub_sample in BioSample.objects(accession__in=biosample.sub_samples):
						sample_obj['children'].append(dict(name=sub_sample.accession))
					sample_obj['value'] = len(sample_obj['children'])
				biosamples_children['children'].append(sample_obj)
			biosamples_children['value'] = len(biosamples_children['children'])
			tree['children'].append(biosamples_children)
		assemblies = Assembly.objects(taxid=organism_obj.taxid)
		if assemblies:
			assembly_children = dict(name='Assemblies', children=list())
			for ass in assemblies:
				assembly_children['children'].append(dict(name=ass.accession, links=[ass.sample_accession],category='assemblies'))
			assembly_children['value'] = len(assembly_children['children'])
			tree['children'].append(assembly_children)
		reads = Experiment.objects(taxid=organism_obj.taxid)
		if reads:
			read_children = dict(name='Reads', children=list())
			for read in reads:
				read_children['children'].append(dict(name=read.experiment_accession, links=[read.metadata['sample_accession']],category='reads'))
			read_children['value'] = len(read_children['children'])
			tree['children'].append(read_children)
		return Response(json.dumps(tree),mimetype="application/json", status=200)

class OrganismsCoordinatesApi(Resource):
	def get(self):
		organisms = organisms_service.get_organisms_locations(**request.args)
		return Response(organisms.to_json(),mimetype="application/json", status=200)
