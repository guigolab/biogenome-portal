from db.models import Assembly, Chromosome,BioSample, Organism
from mongoengine.errors import ValidationError
from errors import NotFound
from mongoengine.queryset.visitor import Q
from utils.clients import ncbi_client, genomehubs_client
from utils.parsers import assembly, biosample,chromosome
from utils.helpers import data, organism, geolocation

ASSEMBLY_FIELDS = ['display_name','chromosomes','assembly_accession','biosample','bioproject_lineages','biosample_accession','org']

FIELDS_TO_EXCLUDE = ['id', 'created', 'chromosomes_aliases']

def get_assembly_related_chromosomes(accession):
    assembly = Assembly.objects(accession=accession).first()
    if not assembly:
        raise NotFound
    return Chromosome.objects(accession_version__in=assembly.chromosomes).exclude('id')

def get_assemblies(args):
    filter = get_filter(args.get('filter'))
    selected_fields = [v for k, v in args.items(multi=True) if k.startswith('fields[]')]
    if not selected_fields:
        selected_fields = ['accession', 'scientific_name', 'taxid']
    return data.get_items(args, 
                                 Assembly, 
                                 FIELDS_TO_EXCLUDE, 
                                 filter,
                                 selected_fields)

def get_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) |  (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter)) | (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter))
    return None

def create_assembly_from_accession(accession):
    if assembly_exists(accession):
        return f"Assembly {accession} already exists", 400
    
    report = fetch_assembly_report(accession)
    if not report:
        return f"Assembly {accession} not found in INSDC", 400

    assembly_obj = parse_assembly(report)
    save_chromosomes(accession, assembly_obj)

    blobtoolkit_id = get_blobtoolkit_id(accession)

    if blobtoolkit_id:
        assembly_obj.blobtoolkit_id = blobtoolkit_id

    organism_obj = organism.handle_organism(assembly_obj.taxid)
    if not organism_obj:
        return f"Organism {assembly_obj.taxid} not found in INSDC", 400

    handle_biosample(assembly_obj)

    print(assembly_obj.to_json())

    assembly_obj.save()
    organism_obj.save()

    return f"Assembly {accession} correctly saved", 201

def get_blobtoolkit_id(accession):
    blobtoolkit_resp = genomehubs_client.get_blobtoolkit_id(accession)
    if len(blobtoolkit_resp) and 'names' in blobtoolkit_resp[0].keys() and len(blobtoolkit_resp[0]['names']):
        return blobtoolkit_resp[0]['names'][0]
    return None

def assembly_exists(accession):
    return Assembly.objects(accession=accession).first()


def fetch_assembly_report(accession):
    args = ['genome', 'accession', accession]
    report = ncbi_client.get_data_from_ncbi(args)
    if report and report.get('reports'):
        return report.get('reports')[0]
    return None


def parse_assembly(report):
    return assembly.parse_assembly_from_ncbi_datasets(report)


def save_chromosomes(accession, assembly_obj):
    sequences_args = ['genome', 'accession', accession, '--report', 'sequence', '--assembly-level', 'chromosome,complete']
    sequence_report = ncbi_client.get_data_from_ncbi(sequences_args)
    if sequence_report and sequence_report.get('reports'):
        chromosomes_to_save = chromosome.parse_chromosomes_from_ncbi_datasets(sequence_report.get('reports'))
        if chromosomes_to_save:
            existing_chromosomes = Chromosome.objects(accession_version__in=[chr.accession_version for chr in chromosomes_to_save]).scalar('accession_version')
            Chromosome.objects.insert([chr for chr in chromosomes_to_save if chr.accession_version not in existing_chromosomes])
            assembly_obj.chromosomes = [chr.accession_version for chr in chromosomes_to_save]


def handle_biosample(assembly_obj):
    if not BioSample.objects(accession=assembly_obj.sample_accession).first():
        biosample_obj = biosample.parse_biosample_from_ncbi_datasets(
            assembly_obj.assembly_info.get('biosample'), assembly_obj.taxid, assembly_obj.scientific_name
        )
        biosample_obj.save()
        geolocation.save_coordinates(biosample_obj)
        geolocation.update_countries_from_biosample(biosample_obj, biosample_obj.accession)


def get_assembly(accession):
    assembly_obj = assembly_exists(accession)
    if not assembly_obj:
        raise NotFound
    if assembly_obj.chromosomes:
        assembly_obj.chromosomes = Chromosome.objects(accession_version__in=assembly_obj.chromosomes).as_pymongo()
    return assembly_obj

# def create_assembly_from_accession(accession):

#     assembly_obj = Assembly.objects(accession=accession).first()
#     if assembly_obj:
#         return  f"Assembly {accession} already exists",400
    
#     args = ['genome', 'accession', accession]
#     report = ncbi_client.get_data_from_ncbi(args)
#     if not report and not report.get('reports'):
#         return f"Assembly {accession} not found in INSDC", 400
    
#     assembly_to_parse = report.get('reports')[0]
#     assembly_obj = assembly.parse_assembly_from_ncbi_datasets(assembly_to_parse)

#     sequences_args = ['genome', 'accession', accession, '--report', 'sequence', '--assembly-level', 'chromosome,complete']
#     sequence_report = ncbi_client.get_data_from_ncbi(sequences_args)
#     if sequence_report and sequence_report.get('reports'):
#         chrosomes_to_save = chromosome.parse_chromosomes_from_ncbi_datasets(sequence_report.get('reports'))
#         if chrosomes_to_save:
#             existing_chromosomes = Chromosome.objects(accession_version__in=[chr.accession_version for chr in chrosomes_to_save]).scalar('accession_version')
#             Chromosome.objects.insert([chr for chr in chrosomes_to_save if chr.accession_version not in existing_chromosomes])
#             assembly_obj.chromosomes = [chr.accession_version for chr in chrosomes_to_save]
    
#     taxid = assembly_obj.taxid

#     organism_obj = Organism.objects(taxid=taxid).first()
#     if not organism_obj:
#         organism_obj = organisms_utils.create_organism_and_related_taxons(taxid)
#         if not organism_obj:
#             return f"Organism {assembly_obj.taxid} not found in INSDC", 400
    
#     #existing biosample
#     if not BioSample.objects(accession=assembly_obj.sample_accession).first():
#         biosample_obj = biosample.parse_biosample_from_ncbi_datasets(assembly_to_parse.get('assembly_info',{}).get('biosample'),assembly_obj.taxid, assembly_obj.scientific_name)
#         biosample_obj.save()
#         sample_locations_service.save_coordinates(biosample_obj)
#         sample_locations_service.update_countries_from_biosample(biosample_obj)

#     assembly_obj.save()

#     organism_obj.save() #update organism status


#     return f"Assembly {accession} correctly saved", 201

#     #import related biosample

# def parse_assembly_from_ncbi_data(assembly):
#     ass_data = dict(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'],scientific_name=assembly['org']['sci_name'],taxid=assembly['org']['tax_id'])
#     if assembly.get('biosample_accession'):
#         ass_data['sample_accession'] = assembly.get('biosample_accession')
#     ass_metadata=dict()
#     for key in assembly.keys():
#         if key not in ASSEMBLY_FIELDS:
#             ass_metadata[key] = assembly[key]
#     blobtoolkit_resp = genomehubs_client.get_blobtoolkit_id(ass_data['accession'])
#     if len(blobtoolkit_resp) and 'names' in blobtoolkit_resp[0].keys() and len(blobtoolkit_resp[0]['names']):
#         ass_data['blobtoolkit_id'] = blobtoolkit_resp[0]['names'][0]
#     ass_obj = Assembly(metadata=ass_metadata, **ass_data)
#     chromosomes = parse_chromosomes(assembly.get('chromosomes'))
#     return ass_obj, chromosomes

# def parse_chromosomes(chromosomes):
#     chr_list = []
#     for chr in chromosomes:
#         if 'accession_version' in chr:
#             metadata=dict()
#             for k in chr.keys():
#                 if k != 'accession_version':
#                     metadata[k] = chr[k]
#             chr_list.append(Chromosome(accession_version=chr.get('accession_version'),metadata=metadata))
#     return chr_list

def delete_assembly(accession):
    assembly_obj = Assembly.objects(accession=accession).first()
    if not assembly_obj:
        raise NotFound 
    assembly_obj.delete()

    organism_obj = Organism.objects(taxid=assembly_obj.taxid).first()
    if organism_obj:
        organism_obj.save()

    return accession

def store_chromosome_aliases(assembly, aliases_file):
    try:
        assembly.chromosomes_aliases = aliases_file.read()
        assembly.has_chromosomes_aliases = True
        assembly.save()
        return "Chromosome aliases successfully updated", 201
    except ValidationError as e:
        return e.to_dict(), 400