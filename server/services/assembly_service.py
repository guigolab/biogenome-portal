from db.models import Assembly, BioSample,Chromosome,AssemblyTrack, Organism,Annotation
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from services import organisms_service,biosample_service,experiment_service,geo_localization_service,bioproject_service,annotations_service
from utils.ncbi_client import get_assembly
from utils.common_functions import query_search

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']
FIELDS_TO_EXCLUDE = ['id','created']

def create_assembly(assembly, organism, sample=None, auto_imported=True):
    ass_metadata=dict()
    for key in assembly.keys():
        if key not in ASSEMBLY_FIELDS:
            ass_metadata[key] = assembly[key]
    if sample:
        ass_obj = Assembly(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=organism.scientific_name, sample_accession= sample.accession,metadata=ass_metadata,taxid=organism.taxid,auto_imported=auto_imported).save()
        sample.modify(add_to_set__assemblies=ass_obj.accession)
    else:
        ass_obj = Assembly(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=organism.scientific_name,metadata=ass_metadata,taxid=organism.taxid,auto_imported=auto_imported).save()
    organism.modify(add_to_set__assemblies=ass_obj.accession)
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

def get_or_create_assembly(accession):
    assembly_obj = Assembly.objects(accession=accession).first()
    if assembly_obj:
        return assembly_obj
    ass_to_save = get_assembly(accession)
    if not ass_to_save:
        return 
    organism = organisms_service.get_or_create_organism(str(ass_to_save['org']['tax_id']))
    if 'biosample_accession' in ass_to_save.keys():
        sample_accession=ass_to_save['biosample_accession']
        sample_obj = biosample_service.get_or_create_biosample(sample_accession,organism,ass_to_save)
        assembly_obj = create_assembly(ass_to_save,organism,sample_obj)
        geo_localization_service.get_or_create_coordinates(sample_obj,organism)
        experiment_service.create_experiments(sample_obj,organism)
        bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism, sample_obj)
    else:
        assembly_obj = create_assembly(ass_to_save,organism)
        bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism)    
    if 'chromosomes' in ass_to_save.keys():
        create_chromosomes(assembly_obj, ass_to_save['chromosomes'])
    return assembly_obj

# def get_or_create_assembly(accession):
#     assembly_obj = Assembly.objects(accession=accession).first()
#     if assembly_obj:
#         return assembly_obj
#     ass_to_save = get_assembly(accession)
#     if not ass_to_save:
#         return 
#     organism = organisms_service.get_or_create_organism(str(ass_to_save['org']['tax_id']))
#     if 'biosample_accession' in ass_to_save.keys():
#         sample_accession=ass_to_save['biosample_accession']
#         sample_obj = biosample_service.get_or_create_biosample(sample_accession,organism,ass_to_save)
#         assembly_obj = create_assembly(ass_to_save,organism,sample_obj)
#         geo_localization_service.get_or_create_coordinates(sample_obj,organism)
#         experiment_service.create_experiments(sample_obj,organism)
#         bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism, sample_obj)
#     else:
#         assembly_obj = create_assembly(ass_to_save,organism)
#         bioproject_service.create_bioprojects_from_NCBI(ass_to_save['bioproject_lineages'],organism)    
#     if 'chromosomes' in ass_to_save.keys():
#         create_chromosomes(assembly_obj, ass_to_save['chromosomes'])
#     organism.save()
#     return assembly_obj

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


def create_assembly_from_accession(accession, assembly_track=None):
    assembly_obj = get_or_create_assembly(accession)
    if not assembly_obj:
        return
    if assembly_track:
        assembly_obj.track = assembly_track
        assembly_obj.save()
    return assembly_obj

def update_assembly_track(accession,assembly_track):
    assembly_obj = get_or_create_assembly(accession)
    if not assembly_obj:
        return
    assembly_obj.track = assembly_track
    assembly_obj.save()
    return assembly_obj

def delete_assembly(accession):
    assembly_obj = get_or_create_assembly(accession)
    if not assembly_obj:
        return 

    annotations_to_delete = Annotation.objects(assembly_accession = accession).delete()

    sample_to_update = BioSample.objects(assemblies=accession).first()
    if sample_to_update:
        sample_to_update.modify(pull_assemblies=accession)

    organism_to_update = organisms_service.get_or_create_organism(assembly_obj.taxid)
    if organism_to_update:
        organism_to_update.modify(pull_assemblies=accession)
        organism_to_update.save()
    return accession