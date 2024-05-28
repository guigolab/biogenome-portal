from clients.ncbi_client import get_data_from_ncbi
from clients.genomehubs_client import get_blobtoolkit_id
from parsers.assembly import parse_assembly_from_ncbi_datasets
from helpers.organism import update_organisms, handle_taxonomic_ids
from helpers.biosample import  handle_sample_accessions
from helpers.assembly import save_chromosomes
from db.models import Assembly,Chromosome
import os
from celery import shared_task
import time

PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

@shared_task(name='import_assemblies',ignore_result=False)
def import_assemblies_by_bioproject(project_accession=None):

    if not project_accession:
        project_accession = PROJECT_ACCESSION

    CMD = ["genome","accession", project_accession]

    result = get_data_from_ncbi(CMD)

    if not result or not result.get("reports"):
        raise f"Nothing found for bioproject {project_accession}"

    reports = result.get("reports")
    print(f"Assemblies for bioproject {project_accession}: {len(reports)}")

    parsed_assemblies = [parse_assembly_from_ncbi_datasets(ass) for ass in reports]
    accession_list = [ass.accession for ass in parsed_assemblies]
    existing_accession_list = Assembly.objects(accession__in=accession_list).scalar('accession')
    new_parsed_assemblies = [ass for ass in parsed_assemblies if ass.accession not in existing_accession_list]
    if not new_parsed_assemblies:
        print(f"Any new assemblt to save!")
        return
    
    print(f"New assemblies to save for bioproject {project_accession}: {len(new_parsed_assemblies)}")
    new_parsed_assemblies = handle_sample_accessions(handle_taxonomic_ids(new_parsed_assemblies))
    saved_assemblies = []
    for new_parsed_assembly in new_parsed_assemblies:
        try:
            save_chromosomes(new_parsed_assembly)
            print(f"Saving assembly {new_parsed_assembly.accession}")
            response = get_blobtoolkit_id(new_parsed_assembly.accession)
            if len(response) and 'names' in response[0].keys() and len(response[0]['names']):
                new_parsed_assembly.blobtoolkit_id = response[0]['names'][0]
            saved_assembly = new_parsed_assembly.save()
            saved_assemblies.append(saved_assembly)
            time.sleep(1.5)
        except Exception as e:
            print(f"Error with assembly {new_parsed_assembly.accession}")
            print(e)
            continue

    if saved_assemblies:
        update_organisms([ass.taxid for ass in saved_assemblies])



@shared_task(name='add_blob_link',ignore_result=False)
def add_blob_link():
    assemblies = Assembly.objects(blobtoolkit_id=None)
    for ass in assemblies:
        response = get_blobtoolkit_id(ass.accession)
        if len(response) and 'names' in response[0].keys() and len(response[0]['names']):
            ass.blobtoolkit_id = response[0]['names'][0]
            ass.save()


@shared_task(name='update_assembly_metadata',ignore_result=False)
def update_assembly_metadata():

    CMD = ["genome","accession", PROJECT_ACCESSION]

    result = get_data_from_ncbi(CMD)

    if not result or not result.get("reports"):
        raise f"Nothing found for bioproject {PROJECT_ACCESSION}"

    reports = result.get("reports")
    print(f"Assemblies for bioproject {PROJECT_ACCESSION}: {len(reports)}")

    parsed_assemblies = [parse_assembly_from_ncbi_datasets(ass) for ass in reports]

    for parsed_assembly in parsed_assemblies:
        assembly_obj = Assembly.objects(accession=parsed_assembly.accession).first()
        if not assembly_obj or assembly_obj.metadata.get('assembly_info'):
            continue
        assembly_obj.metadata = parsed_assembly.metadata
        Chromosome.objects(accession_version__in=assembly_obj.chromosomes).delete()
        try:
            save_chromosomes(assembly_obj)
            print(f"Updating assembly {assembly_obj.accession}")
            assembly_obj.save()
            time.sleep(1.5)
        except Exception as e:
            print(assembly_obj.to_json())
            print(f"Error with assembly {assembly_obj.accession}")
            print(e)
            continue