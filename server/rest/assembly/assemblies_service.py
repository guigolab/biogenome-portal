from db.models import Assembly, Chromosome, Organism
from mongoengine.errors import ValidationError
from errors import NotFound
from mongoengine.queryset.visitor import Q
from clients import ncbi_client, genomehubs_client
from parsers import assembly, chromosome
from helpers import data, organism, biosample as biosample_helper, assembly as assembly_helper

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
    assembly_helper.save_chromosomes(assembly_obj)

    blobtoolkit_id = get_blobtoolkit_id(accession)

    if blobtoolkit_id:
        assembly_obj.blobtoolkit_id = blobtoolkit_id

    organism_obj = organism.handle_organism(assembly_obj.taxid)
    if not organism_obj:
        return f"Organism {assembly_obj.taxid} not found in INSDC", 400

    biosample_obj = biosample_helper.handle_biosample(assembly_obj.sample_accession)

    if not biosample_obj:
        return f"Biosamples {assembly_obj.sample_accession} not found in INSDC", 400

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

def get_assembly(accession):
    assembly_obj = assembly_exists(accession)
    if not assembly_obj:
        raise NotFound
    if assembly_obj.chromosomes:
        assembly_obj.chromosomes = Chromosome.objects(accession_version__in=assembly_obj.chromosomes).as_pymongo()
    return assembly_obj

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