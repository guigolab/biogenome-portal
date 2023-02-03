from db.models import Assembly, BioSample, Chromosome, AssemblyTrack, Organism
from flask import current_app as app
from errors import NotFound
from ..utils import ncbi_client,data_helper
from ..organism import organisms_service
from ..bioproject import bioprojects_service
from ..biosample import biosamples_service
from ..read import reads_service
from mongoengine.queryset.visitor import Q
from datetime import datetime

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']

TRACK_FIELDS = ['fasta_location','fai_location','gzi_location']

ASSEMBLY_LEVELS = ['Chromosome', 'Scaffold', 'Complete Genome', 'Contig']


def get_assemblies(filter=None, filter_option='assembly_name', offset=0, 
                    limit=20, start_date=None, 
                    end_date=datetime.utcnow, assembly_level=None,
                    sort_order=None, sort_column=None,
                    bioproject=None, parent_taxid=None):  
    query=dict()
    ## filter match for accession, assembly name or species name
    if filter:
        filter_query = get_filter(filter, filter_option)
    else:
        filter_query = None
    if assembly_level:
        query['metadata__assembly_level'] = assembly_level
    organism_query = None
    if bioproject and parent_taxid:
        organism_query = dict(bioprojects=bioproject, taxon_lineage=parent_taxid)
    elif bioproject:
        organism_query = dict(bioprojects=bioproject)
    elif parent_taxid:
        organism_query = dict(bioprojects=bioproject)
    if organism_query:
        organisms = Organism.objects(organism_query).scalar('taxid')
        query['taxid__in'] = organisms
    if start_date:
        date_query = (Q(metadata__submission_date__gte=start_date) & Q(metadata__submission_date__lte=end_date))
    else:
        date_query = None
    if filter_query and date_query:
        assemblies = Assembly.objects(filter_query, date_query, **query)
    elif filter_query:
        assemblies = Assembly.objects(filter_query, **query)
    elif date_query:
        assemblies = Assembly.objects(date_query, **query)
    else:
        assemblies = Assembly.objects(**query)
    if sort_column:
        if sort_column == 'submission_date':
            sort_column = 'metadata.submission_date'
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        assemblies = assemblies.order_by(sort)
    return assemblies.count(), assemblies[int(offset):int(offset)+int(limit)]

def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'scientific_name':
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    else:
        return (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter))


def create_assembly_from_ncbi_data(assembly,sample_accession=None):
    print('CREATING ASSEMBLY FROM NCBI DATA')
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

def get_chromosomes(accession):
    assembly = Assembly.objects(accession=accession).first()
    if not assembly or not assembly.chromosomes:
        return
    return Chromosome.objects(accession_version__in=assembly.chromosomes).as_pymongo()

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
    create_data_from_assembly(assembly_obj,ncbi_response)
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
    create_data_from_assembly(assembly_obj,ncbi_response)
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

def create_data_from_assembly(assembly_obj, ncbi_response):
    organism_obj = organisms_service.get_or_create_organism(assembly_obj.taxid)
    if 'biosample' in ncbi_response.keys() and 'attributes' in ncbi_response['biosample'].keys():
        biosample_obj = biosamples_service.create_biosample_from_ncbi_data(assembly_obj.sample_accession,ncbi_response,organism_obj)
    else:
        print('CREATING BIOSAMPLE FROM ACCESSION')
        print(assembly_obj.to_json())
        biosample_obj = biosamples_service.create_biosample_from_accession(assembly_obj.sample_accession)
    if assembly_obj.sample_accession and biosample_obj:
        organism_obj.modify(add_to_set__biosamples=biosample_obj.accession)
        biosamples_to_update = [biosample_obj]
        children_samples = biosamples_service.get_biosamples_derived_from(biosample_obj.accession)
        if children_samples:
            biosamples_to_update.extend(children_samples)
        for saved_biosample in biosamples_to_update:
            bioprojects_service.create_bioprojects_from_NCBI(ncbi_response['bioproject_lineages'],organism_obj, saved_biosample)
            data_helper.create_coordinates(saved_biosample, organism_obj)
            saved_reads = reads_service.create_reads_from_biosample_accession(saved_biosample.accession)
            for read in saved_reads:
                organism_obj.modify(add_to_set__experiments=read)
                saved_biosample.modify(add_to_set__experiments=read)
            if 'sample derived from' in saved_biosample.metadata.keys():
                biosample_obj.modify(add_to_set__sub_samples=saved_biosample.accession)
        biosample_obj.modify(add_to_set__assemblies=assembly_obj.accession)
    else:
        bioprojects_service.create_bioprojects_from_NCBI(ncbi_response['bioproject_lineages'],organism_obj)   
    organism_obj.modify(add_to_set__assemblies=assembly_obj.accession)
    organism_obj.save()
    return organism_obj