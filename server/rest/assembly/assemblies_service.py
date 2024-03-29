from db.models import Assembly, Chromosome,BioSample
from mongoengine.errors import ValidationError
from errors import NotFound
from ..utils import ncbi_client,genomehubs_client
from ..organism import organisms_service
from ..biosample import biosamples_service
from mongoengine.queryset.visitor import Q

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']

ASSEMBLY_LEVELS = ['Chromosome', 'Scaffold', 'Complete Genome', 'Contig']

FIELDS_TO_EXCLUDE = ['id', 'created', 'chromosomes_aliases']

def get_assemblies(filter=None, filter_option='assembly_name', 
                    offset=0, submitter=None,
                    limit=20, start_date=None, 
                    end_date=None, assembly_level=None,
                    sort_order=None, sort_column=None, blobtoolkit=None):  
    
    assemblies = Assembly.objects().exclude(*FIELDS_TO_EXCLUDE)
    if filter:
        filter_query = get_filter(filter, filter_option)        
        assemblies = assemblies.filter(filter_query)

    query = {}
    if assembly_level and assembly_level in ASSEMBLY_LEVELS:
        query['metadata__assembly_level'] = assembly_level

    if submitter:
        query['metadata__submitter'] = submitter

    if blobtoolkit and blobtoolkit.lower() == 'true':
        query['blobtoolkit_id__exists'] = True

    if start_date and end_date:
        assemblies = assemblies.filter((Q(metadata__submission_date__gte=start_date) & Q(metadata__submission_date__lte=end_date)))

    if query.keys():
        assemblies = assemblies.filter(**query)

    if sort_column:
        sort_column_map = {
            'submission_date': 'metadata.submission_date',
            'size': 'metadata.estimated_size',
            'contig_n50': 'metadata.contig_n50'
        }
        sort_column = sort_column_map.get(sort_column, sort_column)
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        assemblies = assemblies.order_by(sort)

    return assemblies.count(), assemblies[int(offset):int(offset) + int(limit)]


def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'scientific_name':
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    else:
        return (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter))
    
def create_assembly_from_accession(accession):
    assembly_obj = Assembly.objects(accession=accession).first()
    if assembly_obj:
        return  f"Assembly {accession} already exists",400
    
    ncbi_response = ncbi_client.get_assembly(accession)
    if not ncbi_response:
        return f"Assembly {accession} not found in INSDC", 400
    
    assembly_obj, chromosomes = parse_assembly_from_ncbi_data(ncbi_response)
    
    organism = organisms_service.get_or_create_organism(assembly_obj.taxid)
    if not organism:
        return f"Organism {assembly_obj.taxid} not found in INSDC", 400
    
    biosample_accession = ncbi_response.get('biosample_accession')
    if biosample_accession and not BioSample.objects(accession=biosample_accession).first():
        if ncbi_response.get('biosample') and ncbi_response.get('biosample').get('attributes'):
            biosample_object = biosamples_service.parse_biosample_from_ncbi_data(ncbi_response)
            biosample_object.save()
        else:
            biosample_object = biosamples_service.get_or_create_biosample(ncbi_response.get('biosample_accession'))
    
    if chromosomes:
        ##avoid duplicated chromosomes
        existing_chromosomes = Chromosome.objects(accession_version__in=[ch.accession_version for ch in chromosomes]).scalar('accession_version')
        filtered_chromosomes = [chr for chr in chromosomes if not chr.accession_version in existing_chromosomes]
        Chromosome.objects.insert(filtered_chromosomes)
        assembly_obj.chromosomes = [chr.accession_version for chr in chromosomes]

    assembly_obj.save()

    organism.save() #update organism status
    return f"Assembly {accession} correctly saved", 201

    #import related biosample
def parse_assembly_from_ncbi_data(assembly):
    ass_data = dict(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=assembly['org']['sci_name'],taxid=assembly['org']['tax_id'])
    if assembly.get('biosample_accession'):
        ass_data['sample_accession'] = assembly.get('biosample_accession')
    ass_metadata=dict()
    for key in assembly.keys():
        if key not in ASSEMBLY_FIELDS:
            ass_metadata[key] = assembly[key]
    blobtoolkit_resp = genomehubs_client.get_blobtoolkit_id(ass_data['accession'])
    if len(blobtoolkit_resp) and 'names' in blobtoolkit_resp[0].keys() and len(blobtoolkit_resp[0]['names']):
        ass_data['blobtoolkit_id'] = blobtoolkit_resp[0]['names'][0]
    ass_obj = Assembly(metadata=ass_metadata, **ass_data)
    chromosomes = parse_chromosomes(assembly.get('chromosomes'))
    return ass_obj, chromosomes

def parse_chromosomes(chromosomes):
    chr_list = []
    for chr in chromosomes:
        if 'accession_version' in chr:
            metadata=dict()
            for k in chr.keys():
                if k != 'accession_version':
                    metadata[k] = chr[k]
            chr_list.append(Chromosome(accession_version=chr.get('accession_version'),metadata=metadata))
    return chr_list

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
        return []
    return Chromosome.objects(accession_version__in=assembly.chromosomes).as_pymongo()

def delete_assembly(accession):
    assembly_obj = Assembly.objects(accession=accession).first()
    if not assembly_obj:
        raise NotFound 
    organism = organisms_service.get_or_create_organism(assembly_obj.taxid)
    assembly_obj.delete()
    organism.save()
    return accession

def store_chromosome_aliases(assembly, aliases_file):
    try:
        assembly.chromosomes_aliases = aliases_file.read()
        assembly.has_chromosomes_aliases = True
        assembly.save()
        return "Chromosome aliases successfully updated", 201
    except ValidationError as e:
        return e.to_dict(), 400