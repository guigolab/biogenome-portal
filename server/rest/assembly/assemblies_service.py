from db.models import Assembly, Chromosome, GenomeAnnotation
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from clients import ncbi_client, genomehubs_client
from parsers import assembly
from jobs import assemblies as assemblies_jobs
from helpers import data, organism, biosample as biosample_helper, assembly as assembly_helper
from flask import send_file
import io

def get_related_chromosomes(accession):
    ass = get_assembly(accession)
    chromosomes = Chromosome.objects(metadata__assembly_accession=accession)
    if not chromosomes.count():
        chromosomes = Chromosome.objects(accession_version__in=ass.chromosomes)
    return chromosomes.exclude('id')

def get_assemblies_from_annotations(args):
    distinct_accessions = GenomeAnnotation.objects().distinct('assembly_accession')
    new_dict = dict(accession__in=list(distinct_accessions) ,**args)
    return data.get_items('assemblies', new_dict)

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


def get_related_annotations(accession):
    get_assembly(accession)
    return GenomeAnnotation.objects(assembly_accession=accession).exclude('id','created').to_json()

def get_chr_aliases_file(accession):
    assembly_obj = get_assembly(accession)
    
    # Query chromosomes based on accession_version
    chromosomes = Chromosome.objects(metadata__assembly_accession=accession)
    if not chromosomes.count():
        chromosomes = Chromosome.objects(accession_version__in=assembly_obj.chromosomes)   

    if not chromosomes:
        raise BadRequest(description=f"Assembly {accession} lacks chromosomes")
    
    # Prepare the TSV data
    tsv_data = io.StringIO()
    
    # Assuming chromosomes is a list of dictionaries with fields 'name' and 'accession_version'
    for chromosome in chromosomes:
        name = chromosome.metadata.get('chr_name')
        if not name:
            name = chromosome.metadata.get('name')
        accession_version = chromosome.accession_version
        tsv_data.write(f"{name}\t{accession_version}\n")
    
    tsv_data.seek(0)  # Go back to the start of the StringIO object
    
    # Send the TSV as a downloadable file
    return send_file(
        io.BytesIO(tsv_data.getvalue().encode('utf-8')),  # Convert StringIO to bytes
        mimetype='text/tab-separated-values',
        as_attachment=True,
        download_name=f'{assembly_obj.accession}_chr_aliases.tsv'
    )

def trigger_accessions_job(data):
    accessions = data.get('accessions')
    if not accessions:
        raise BadRequest(description=f"Missing accessions")
    task = assemblies_jobs.import_assemblies_from_accessions.delay(accessions)
    return dict(id=task.id, state=task.state)
