from clients.ncbi_client import get_data_from_ncbi
from clients.genomehubs_client import get_blobtoolkit_id
from parsers.assembly import parse_assembly_from_ncbi_datasets
from helpers.organism import handle_organism
from helpers.biosample import  handle_biosample
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

    #Collect assembly ids
    CMD = ["genome","accession", project_accession, "--report","ids_only", "--assembly-source", "GenBank"]
    result = get_data_from_ncbi(CMD)

    if not result or not result.get("reports"):
        raise f"Nothing found for bioproject {project_accession}"


    new_assembly_accession_list = [ass.get('accession') for ass in result.get("reports")]

    #retrieve existing assemblies
    existing_assembly_accession_list = Assembly.objects(accession__in=new_assembly_accession_list).scalar('accession')
    new_assembly_accession_list = [acc for acc in new_assembly_accession_list if acc not in existing_assembly_accession_list]

    if not new_assembly_accession_list:
        print(f"Any new assembly to save")
        return

    new_ids_length = len(new_assembly_accession_list) 

    print(f"New assemblies for bioproject {project_accession}: {new_ids_length}")

    saved_assemblies = 0
    for new_accession in new_assembly_accession_list:

        args = ['genome', 'accession', new_accession]
        report = get_data_from_ncbi(args)

        if not report or not report.get('reports'):
            print(f"Something happened with assemby {new_accession}, skipping it..")
            continue

        parsed_assembly = parse_assembly_from_ncbi_datasets(report.get('reports')[0])
        save_chromosomes(parsed_assembly)

        try:

            print(f"fetching organism {parsed_assembly.taxid} and its related taxons for {new_accession}")
            organism = handle_organism(parsed_assembly.taxid)
            
            if not organism:
                print(f"Any organism found for taxid: {parsed_assembly.taxid} of assembly {new_accession}")
                print(f"Skipping assembly {new_accession}..")
                continue

            print(f"fetching biosample {parsed_assembly.sample_accession} of assembly {new_accession}")
            biosample = handle_biosample(parsed_assembly.sample_accession)

            if not biosample:
                print(f"Any biosample found for accession: {parsed_assembly.sample_accession} of assembly {new_accession}")
                print(f"Skipping assembly {new_accession}..")
                continue

            print(f"Saving assembly {parsed_assembly.accession}")
            parsed_assembly.save()
            saved_assemblies += 1 

            print(f"Updating organism {organism.scientific_name}")
            organism.save()

        except Exception as e:
            print(e)
            print(f"Impossible to save assembly {new_accession}, 'skipping it..")
            Chromosome.objects(accession_version__in=parsed_assembly.chromosomes).delete()
            continue

    print(f"Job executed. Saved {saved_assemblies} out of {len(new_ids_length)}")

    
@shared_task(name='add_blob_link',ignore_result=False)
def add_blob_link():
    assemblies_accession_list = Assembly.objects(blobtoolkit_id=None).scalar('accession')
    for acc in assemblies_accession_list:
        response = get_blobtoolkit_id(acc)
        if len(response) and 'names' in response[0].keys() and len(response[0]['names']):
            ass = Assembly.objects(accession=acc).first()
            ass.blobtoolkit_id = response[0]['names'][0]
            ass.save()


@shared_task(name='update_assembly_metadata',ignore_result=False)
def update_assembly_metadata():

    assemblies_to_update = Assembly.objects(metadata__assembly_info=None)

    print(f"A total of {len(assemblies_to_update)} assemblies have been found")

    for assembly_to_update in assemblies_to_update:
        
        CMD = ["genome","accession", assembly_to_update.accession]

        result = get_data_from_ncbi(CMD)

        if not result or not result.get("reports"):
            print(f"Nothing found for assembly {assembly_to_update.accession}")
            continue
        parsed_assemblies = [parse_assembly_from_ncbi_datasets(ass) for ass in result.get("reports")]
        for parsed_assembly in parsed_assemblies:
            if parsed_assembly.accession == assembly_to_update.accession:
                assembly_to_update.update(metadata=parsed_assembly.metadata)
        time.sleep(1.5)
    print("Update done")