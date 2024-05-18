from clients.ncbi_client import get_data_from_ncbi
from clients.genomehubs_client import get_blobtoolkit_id
from parsers.assembly import parse_assembly_from_ncbi_datasets
from helpers.organism import handle_organism
from helpers.biosample import handle_biosample_from_ncbi_dataset
from helpers.assembly import save_chromosomes
from db.models import Assembly
import os
from celery import shared_task
# from extensions.celery import celery

"""
IMPORT ASSEMBLIES BY BIOPROJECT

"""

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
    existing_assemblies = Assembly.objects().scalar('accession')
    new_parsed_assemblies = [parse_assembly_from_ncbi_datasets(ass) for ass in reports if ass.get('accession') not in existing_assemblies]
    
    print(f"New assemblies to save for bioproject {project_accession}: {len(new_parsed_assemblies)}")

    for new_parsed_assembly in new_parsed_assemblies:
        organism = handle_organism(new_parsed_assembly.taxid)
        if not organism:
            print(f'Skipping assembly {new_parsed_assembly.accession} because organism with taxid:{new_parsed_assembly.taxid} was not found in INSDC')
        save_chromosomes(new_parsed_assembly)
        handle_biosample_from_ncbi_dataset(new_parsed_assembly)

        
        print(f"Saving assembly {new_parsed_assembly.accession} for species {organism.scientific_name}")
        
        new_parsed_assembly.save()
        organism.save()



# @celery.task(name="add_blob_link")
def add_blob_link():
    assemblies = Assembly.objects(blobtoolkit_id=None)
    for ass in assemblies:
        response = get_blobtoolkit_id(ass.accession)
        if len(response) and 'names' in response[0].keys() and len(response[0]['names']):
            ass.blobtoolkit_id = response[0]['names'][0]
            ass.save()
