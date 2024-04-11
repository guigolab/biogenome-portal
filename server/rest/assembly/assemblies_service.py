from db.models import Assembly, Chromosome,BioSample,Organism
from mongoengine.errors import ValidationError
from errors import NotFound
from ..utils import ncbi_client,genomehubs_client
from ..organism import organisms_service
from ..biosample import biosamples_service
from mongoengine.queryset.visitor import Q

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']

FIELDS_TO_EXCLUDE = ['id', 'created', 'chromosomes_aliases']

def get_assemblies(args):  

    filter = args.get('filter')
    q_query = get_filter(filter) if filter else None        
    limit = int(args.get('limit', 10))
    offset = int(args.get('offset', 0))
    sort_column = args.get('sort_column')
    sort_order = args.get('sort_order', 'desc')
    query={}
    
    for k, v in args.items():

        if not v:
            continue

        if k == "parent_taxon":
            taxids = Organism.objects(taxon_lineage=v).scalar('taxid')
            query['taxid__in'] = taxids

        elif k == "filter":
            continue
        elif k == "blobtoolkit":
            
            if v.lower() == 'true':
                query['blobtoolkit_id__exists'] = True

        elif "__gte" in k or "__lte" in k:
            query_visitor = {f"metadata__{k}":v}
            q_query = Q(**query_visitor) & q_query if q_query else Q(**query_visitor)

        elif k in ("limit", "offset", "sort_order", "sort_column"):
            continue
        else:
            query[f"metadata__{k}"] = v

    assemblies = Assembly.objects(**query).exclude(*FIELDS_TO_EXCLUDE)
    if q_query:
        assemblies = assemblies.filter(q_query)

    if sort_column:
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        assemblies = assemblies.order_by(sort)

    return assemblies.count(), assemblies.skip(int(offset)).limit(int(limit))


def get_filter(filter):
    return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) |  (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter)) | (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter))
    
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