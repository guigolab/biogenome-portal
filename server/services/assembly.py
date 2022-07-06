from db.models import Assembly, BioSample,Chromosome,AssemblyTrack, Organism,Annotation
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from server.services import bioproject, geo_localization
from services import organisms_service,biosample_service,experiment_service,annotations_service
from utils import ncbi_client
from utils.common_functions import query_search,get_model_objects

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']
FIELDS_TO_EXCLUDE = ['id','created']
TRACK_FIELDS = ['fasta_location','fai_location','gzi_location']

def create_assembly_from_ncbi_data(assembly,sample_accession=None):
    ass_data = dict(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=assembly['org']['sci_name'])
    ass_metadata=dict()
    for key in assembly.keys():
        if key not in ASSEMBLY_FIELDS:
            ass_metadata[key] = assembly[key]
    if sample_accession:
        ass_data['sample_accession'] = sample_accession
    ass_obj = Assembly(metadata=ass_metadata, **ass_data).save()
    if 'chromosomes' in assembly.keys():
        create_chromosomes(ass_obj, assembly['chromosomes'])
    return ass_obj
    
def create_chromosomes(assembly,chromosomes):
    for chr in chromosomes:
        if not 'accession_version' in chr.keys():
            continue
        chr_obj = Chromosome.objects(accession_version = chr['accession_version']).first()
        if not chr_obj:
            metadata=dict()
            for k in chr.keys():
                if k != 'accession_version':
                    metadata[k] = chr[k]
            chr_obj = Chromosome(accession_version=chr['accession_version'], metadata=metadata).save()
        assembly.modify(add_to_set__chromosomes=chr_obj.accession_version)

def get_query_filter(filter):
    return (Q(accession__iexact=filter) | Q(accession__icontains=filter) | Q(assembly_name__icontains=filter) | Q(assembly_name__iexact=filter) | Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def get_assemblies(offset=0, limit=20, filter=None):
    if filter:
        query_filter = get_query_filter(filter)
        items = query_search(Assembly,FIELDS_TO_EXCLUDE,query_filter=query_filter)
    else:
        items = query_search(Assembly,FIELDS_TO_EXCLUDE)
    json_resp = dict()
    json_resp['total'] = items.count()
    json_resp['data'] = items[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)

def create_assembly_from_accession(accession,data=None):
    if get_model_objects(Assembly, dict(accession=accession)).first():
        return
    ncbi_response = ncbi_client.get_assembly(accession)
    if not ncbi_response:
        return
    assembly_obj = create_assembly_from_ncbi_data(ncbi_response)
    assembly_track = create_assembly_track(data)
    if assembly_track:
        assembly_obj.track = assembly_track
        assembly_obj.save()
    ##create data here
    return assembly_obj

def create_assembly_track(data):
    if data and [f for f in data.keys() if f in TRACK_FIELDS]:
        return AssemblyTrack(**data)
    
def update_assembly_track(accession, assembly_track):
    assembly_obj = Assembly.objects(accession=accession).first()
    if not assembly_obj:
        return 
    assembly_track = create_assembly_track(assembly_track)
    if assembly_track:
        assembly_obj.track = assembly_track
        assembly_obj.save()
    return assembly_obj

def delete_assembly(accession):
    assembly_obj = Assembly.objects(accession=accession).first()
    if not assembly_obj:
        return 
    Annotation.objects(assembly_accession = accession).delete()
    sample_to_update = BioSample.objects(assemblies=accession).first()
    if sample_to_update:
        sample_to_update.modify(pull_assemblies=accession)
    organism_to_update = Organism.objects(taxid=assembly_obj.taxid).first()
    if organism_to_update:
        organism_to_update.modify(pull_assemblies=accession)
        organism_to_update.save()
    return accession