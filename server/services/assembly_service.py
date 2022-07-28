from db.models import Assembly, BioSample,Chromosome,AssemblyTrack, Organism
from flask import current_app as app
from errors import NotFound
from utils import ncbi_client
from utils import data_helper

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']
TRACK_FIELDS = ['fasta_location','fai_location','gzi_location']

def create_assembly_from_ncbi_data(assembly,sample_accession=None):
    print('CREATEING ASSEMBLY FROM NCBI DATA')
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

##return response obj
def create_assembly_from_accession_input(accession):
    resp_obj=dict()
    assembly_obj = Assembly.objects(accession=accession).first()
    if assembly_obj:
        resp_obj['message'] = f"{accession} already exists"
        resp_obj['status'] = 400
        return resp_obj
    ncbi_response = ncbi_client.get_assembly(accession)
    if not ncbi_response:
        resp_obj['message'] = f"{accession} not found in INSDC"
        resp_obj['status'] = 400
        return resp_obj
    sample_accession = ncbi_response['biosample_accession'] if 'biosample_accession' in ncbi_response.keys() else None
    assembly_obj = create_assembly_from_ncbi_data(ncbi_response,sample_accession)
    data_helper.create_data_from_assembly(assembly_obj,ncbi_response)
    if assembly_obj:
        resp_obj['message'] = f'{assembly_obj.accession} correctly saved' 
        resp_obj['status'] = 201
        return resp_obj
    resp_obj['message'] = 'Unhandled error'
    resp_obj['status'] = 500
    return resp_obj


def create_assembly_from_accession(accession):
    assembly_obj = Assembly.objects(accession=accession).first()
    if assembly_obj:
        return assembly_obj
    ncbi_response = ncbi_client.get_assembly(accession)
    if not ncbi_response:
        return
    sample_accession = ncbi_response['biosample_accession'] if 'biosample_accession' in ncbi_response.keys() else None
    assembly_obj = create_assembly_from_ncbi_data(ncbi_response,sample_accession)
    data_helper.create_data_from_assembly(assembly_obj,ncbi_response)
    return assembly_obj

def create_assembly_track(data):
    if data and [f for f in data.keys() if f in TRACK_FIELDS]:
        return AssemblyTrack(**data)
    
def delete_assembly(accession):
    assembly_obj = Assembly.objects(accession=accession).first()
    if not assembly_obj:
        raise NotFound 
    sample_to_update = BioSample.objects(assemblies=accession).first()
    if sample_to_update:
        sample_to_update.modify(pull__assemblies=accession)
    organism_to_update = Organism.objects(taxid=assembly_obj.taxid).first()
    if organism_to_update:
        organism_to_update.modify(pull__assemblies=accession)
        organism_to_update.save()
    assembly_obj.delete()
    return accession