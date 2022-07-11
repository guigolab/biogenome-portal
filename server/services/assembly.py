from db.models import Assembly, BioSample,Chromosome,AssemblyTrack, Organism,Annotation
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from utils import ncbi_client
from utils.common_functions import query_search
from utils import data_helper

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']
TRACK_FIELDS = ['fasta_location','fai_location','gzi_location']

def create_assembly_from_ncbi_data(assembly,sample_accession=None):
    ass_data = dict(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=assembly['org']['sci_name'],taxid=assembly['org']['tax_id'])
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

def create_assembly_from_accession(accession,data=None):
    assembly_obj = Assembly.objects(accession=accession).first()
    if assembly_obj:
        return assembly_obj

    ncbi_response = ncbi_client.get_assembly(accession)
    app.logger.info(ncbi_response)
    if not ncbi_response:
        return

    sample_accession = ncbi_response['sample_accession'] if 'sample_accession' in ncbi_response.keys() else None
        
    assembly_obj = create_assembly_from_ncbi_data(ncbi_response,sample_accession)
    assembly_track = create_assembly_track(data)
    if assembly_track:
        assembly_obj.track = assembly_track
        assembly_obj.save()
    
    data_helper.create_data_from_assembly(assembly_obj,ncbi_response)
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
    sample_to_update = BioSample.objects(assemblies=accession).first()
    if sample_to_update:
        sample_to_update.modify(pull__assemblies=accession)
    organism_to_update = Organism.objects(taxid=assembly_obj.taxid).first()
    if organism_to_update:
        organism_to_update.modify(pull__assemblies=accession)
        organism_to_update.save()
    assembly_obj.delete()
    return accession