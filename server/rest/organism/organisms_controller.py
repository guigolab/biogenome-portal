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
		print(Organism.objects(goat_status=None).to_json())
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

class OrganismINSDCDataApi(Resource):
	def get(self, taxid):
		organism_obj = Organism.objects(taxid=taxid).first()
		if not organism_obj:
			raise NotFound
		tree = dict(taxid=organism_obj.taxid, children=list(), category=organism_obj.scientific_name)
		tree['value'] = 10
		biosamples = BioSample.objects(taxid=organism_obj.taxid)
		if biosamples:
			biosamples_children = dict(category='BioSamples', children=list())
			sub_samples = list(itertools.chain(*[bs.sub_samples for bs in biosamples]))
			for biosample in biosamples:
				if biosample.accession in sub_samples:
					continue
				category = biosample.accession
				metadata = biosample.metadata
				for key in metadata.keys():
					if key == 'tissue' or key == 'organism_part' or key == 'organism part' or 'tissue' in key.lower():
						category = metadata[key]
				sample_obj = dict(name=biosample.accession,category=category)
				if biosample.sub_samples:
					sample_obj['children'] = list()
					for sub_sample in BioSample.objects(accession__in=biosample.sub_samples):
						category = sub_sample.accession
						sub_sample_metadata = sub_sample.metadata
						for key in sub_sample_metadata.keys():
							if key == 'tissue' or key == 'organism_part' or key == 'organism part' or 'tissue' in key.lower():
								category = sub_sample_metadata[key]	
						sample_obj['children'].append(dict(name=sub_sample.accession, category=category))
					sample_obj['value'] = len(sample_obj['children'])
				biosamples_children['children'].append(sample_obj)
			biosamples_children['value'] = len(biosamples_children['children'])
			tree['children'].append(biosamples_children)
		assemblies = Assembly.objects(taxid=organism_obj.taxid)
		if assemblies:
			assembly_children = dict(category='Assemblies', children=list())
			for ass in assemblies:
				category = ass.assembly_name if ass.assembly_name else ass.accession
				assembly_children['children'].append(dict(name=ass.accession, links=[ass.sample_accession],category=category))
			assembly_children['value'] = len(assembly_children['children'])
			tree['children'].append(assembly_children)
		reads = Experiment.objects(taxid=organism_obj.taxid)
		if reads:
			read_children = dict(category='Reads', children=list())
			for read in reads:
				category = read.instrument_platform if read.instrument_platform else read.experiment_accession
				read_children['children'].append(dict(name=read.experiment_accession, category=category, links=[read.metadata['sample_accession']]))
			read_children['value'] = len(read_children['children'])
			tree['children'].append(read_children)
		return Response(json.dumps(tree),mimetype="application/json", status=200)

class OrganismsCoordinatesApi(Resource):
	def get(self):
		organisms = organisms_service.get_organisms_locations(**request.args)
		return Response(organisms.to_json(),mimetype="application/json", status=200)
