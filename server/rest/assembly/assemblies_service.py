from db.models import Assembly, Chromosome, GenomeAnnotation
from werkzeug.exceptions import BadRequest, Conflict
from clients import ncbi_client, genomehubs_client
from parsers import assembly
from jobs import assemblies as assemblies_jobs
from helpers import data, organism, biosample as biosample_helper, assembly as assembly_helper
from flask import Response
from rest.common.service_utils import get_or_404

def get_related_chromosomes(accession, args):
    ass = get_assembly(accession)
    chromosomes = Chromosome.objects(metadata__assembly_accession=accession)
    if not chromosomes.count():
        chromosomes = Chromosome.objects(accession_version__in=ass.chromosomes)
    chromosomes = chromosomes.exclude('id')
    fields = ['name', 'accession_version']
    return data.get_related_items(
        chromosomes,
        args,
        fields=fields,
        allowed_fields=fields + ['metadata', 'taxid'],
        default_sort_column='accession_version',
    )

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

    assembly_helper.save_chromosomes_from_stream(assembly_obj)

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
    # Organism status + TaxonNode counts: Assembly post_save -> taxon_organism_sync

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
    return get_or_404(Assembly, f"Assembly {assembly_accession} not found", accession=assembly_accession)

def delete_assembly(accession):

    assembly_obj = get_assembly(accession)
    assembly_obj.delete()
    # Cascades: chromosomes, annotations, organism/taxon refresh (models post_delete)

    return accession


def get_related_annotations(accession, args):
    get_assembly(accession)
    annotations = GenomeAnnotation.objects(assembly_accession=accession).exclude('id','created')
    fields = ['name', 'scientific_name', 'taxid', 'assembly_accession']
    return data.get_related_items(
        annotations,
        args,
        fields=fields,
        allowed_fields=fields + ['metadata', 'taxon_lineage'],
        default_sort_column='name',
    )

def get_chr_aliases_file(accession):
    assembly_obj = get_assembly(accession)
    
    # Query chromosomes based on accession_version
    chromosomes = Chromosome.objects(metadata__assembly_accession=accession)
    if not chromosomes.count():
        chromosomes = Chromosome.objects(accession_version__in=assembly_obj.chromosomes)   

    if not chromosomes:
        raise BadRequest(description=f"Assembly {accession} lacks chromosomes")

    def stream_aliases():
        for chromosome in chromosomes.no_cache().only('metadata.chr_name', 'metadata.name', 'accession_version'):
            name = chromosome.metadata.get('chr_name') or chromosome.metadata.get('name') or ''
            accession_version = chromosome.accession_version or ''
            yield f"{name}\t{accession_version}\n".encode('utf-8')

    response = Response(stream_aliases(), mimetype='text/tab-separated-values', status=200)
    response.headers['Content-Disposition'] = (
        f'attachment; filename={assembly_obj.accession}_chr_aliases.tsv'
    )
    return response

def trigger_accessions_job(data):
    accessions = data.get('accessions')
    if not accessions:
        raise BadRequest(description=f"Missing accessions")
    task = assemblies_jobs.import_assemblies_from_accessions.delay(accessions)
    return dict(id=task.id, state=task.state)
