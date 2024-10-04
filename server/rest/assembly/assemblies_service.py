from db.models import Assembly, Chromosome, GenomeAnnotation
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from clients import ncbi_client, genomehubs_client
from parsers import assembly
from helpers import data, organism, biosample as biosample_helper, assembly as assembly_helper
from flask import send_file
import io

def get_related_chromosomes(accession):
    assembly = get_assembly(accession)
    return Chromosome.objects(accession_version__in=assembly.chromosomes).exclude('id')

def get_assemblies(args):
    return data.get_items('assemblies', args)

def create_assembly_from_accession(accession):
    if Assembly.objects(accession=accession).first():
        raise Conflict(description=f"Assembly {accession} already exists")
    
    report = fetch_assembly_report(accession)
    if not report:
        raise BadRequest(description=f"Assembly {accession} not found in INSDC")

    assembly_obj = assembly.parse_assembly_from_ncbi_datasets(report)

    assembly_helper.save_chromosomes(assembly_obj)

    blobtoolkit_id = get_blobtoolkit_id(accession)

    if blobtoolkit_id:
        assembly_obj.blobtoolkit_id = blobtoolkit_id

    organism_obj = organism.handle_organism(assembly_obj.taxid)
    if not organism_obj:
        raise BadRequest(description=f"Organism {assembly_obj.taxid} not found in INSDC")

    biosample_obj = biosample_helper.handle_biosample(assembly_obj.sample_accession)

    if not biosample_obj:
        raise BadRequest(description=f"BioSample {assembly_obj.sample_accession} not found in INSDC")

    assembly_obj.save()
    organism_obj.save()

    return accession

def get_blobtoolkit_id(accession):
    blobtoolkit_resp = genomehubs_client.get_blobtoolkit_id(accession)
    if len(blobtoolkit_resp) and 'names' in blobtoolkit_resp[0].keys() and len(blobtoolkit_resp[0]['names']):
        return blobtoolkit_resp[0]['names'][0]


def fetch_assembly_report(accession):
    args = ['genome', 'accession', accession]
    report = ncbi_client.get_data_from_ncbi(args)
    if report and report.get('reports'):
        return report.get('reports')[0]


def get_assembly(assembly_accession):
    assembly_obj = Assembly.objects(accession=assembly_accession).first()
    if not assembly_obj:
        raise NotFound(description=f"Assembly {assembly_accession} not found")
    return assembly_obj

def delete_assembly(accession):

    assembly_obj = get_assembly(accession)
    
    Chromosome.objects(accession_version__in=assembly_obj.chromosomes).delete()
    GenomeAnnotation.objects(assembly_accession=accession).delete()
    assembly_obj.delete()

    organism_obj = organism.handle_organism(assembly_obj.taxid)
    if organism_obj:
        organism_obj.save()

    return accession

def store_chromosome_aliases(accession, request):
    assembly = get_assembly(accession)
    aliases_file = request.files.get('chr_aliases')
    if not aliases_file:
        raise BadRequest(description=f"chr_aliases file is required!")
    
    assembly.chromosomes_aliases = aliases_file.read()
    assembly.has_chromosomes_aliases = True
    assembly.save()
    return "Chromosome aliases successfully updated"

def get_related_annotations(accession):
    get_assembly(accession)
    return GenomeAnnotation.objects(assembly_accession=accession).exclude('id','created').to_json()

def get_chr_aliases_file(accession):
    assembly_obj = get_assembly(accession)
    if not assembly_obj.has_chromosomes_aliases:
        raise BadRequest(description=f"Assembly {accession} lacks of chromosome aliases file")
    return send_file(
    io.BytesIO(assembly_obj.chromosomes_aliases),
    mimetype='text/plain',
    as_attachment=True,
    download_name=f'{assembly_obj.accession}_chr_aliases.txt')
    