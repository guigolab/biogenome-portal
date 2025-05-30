from clients.ncbi_client import get_data_from_ncbi
from clients.genomehubs_client import get_blobtoolkit_id
from parsers.assembly import parse_assembly_from_ncbi_datasets
from helpers.organism import handle_organism
from helpers.biosample import  handle_biosample
from helpers.assembly import save_chromosomes
from helpers.data import update_lineage
from db.models import Assembly, Chromosome
from celery import shared_task
import os

PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

#TODO: should mirror assemblies -> delete assemblies not present in INSDC anymore
@shared_task(name='assemblies_import',ignore_result=False)
def import_assemblies_by_bioproject(project_accession=None):
    if not project_accession:
        project_accession = PROJECT_ACCESSION

    #Collect assembly ids
    CMD = ["genome","accession", project_accession, "--report", "ids_only", "--assembly-source", "GenBank"]
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

            #add lineage
            update_lineage(parsed_assembly, organism)

        except Exception as e:
            print(e)
            print(f"Impossible to save assembly {new_accession}, 'skipping it..")
            Chromosome.objects(metadata__assembly_accession=new_accession).delete()
            continue

    print(f"Job executed. Saved {saved_assemblies} out of {new_ids_length}")


@shared_task(name='accessions_import',ignore_result=False)
def import_assemblies_from_accessions(accessions):
    #retrieve existing assemblies
    existing_assembly_accession_list = Assembly.objects(accession__in=accessions).scalar('accession')
    
    new_assembly_accession_list = [acc for acc in accessions if acc not in existing_assembly_accession_list]

    if not new_assembly_accession_list:
        print(f"Any new assembly to save")
        return

    new_ids_length = len(new_assembly_accession_list) 

    print(f"New assemblies found: {new_ids_length}")
    #write accessions to file and pass the file to datasets
    open('assemblies.txt', 'w').write('\n'.join(new_assembly_accession_list))
    args = ['genome', 'accession', '--inputfile', 'assemblies.txt']
    datasets_response = get_data_from_ncbi(args)
    reports = datasets_response.get('reports')
    if not reports:
        print(f"No assemblies found in NCBI Datasets")
        return
    
    print(f"Found {len(reports)} assemblies out of {new_ids_length}")

    saved_assemblies = 0
    for ass in reports:

        parsed_assembly = parse_assembly_from_ncbi_datasets(ass)
        new_accession = parsed_assembly.accession

        #double check assembly is actually in the given accession list
        if new_accession not in new_assembly_accession_list:
            continue
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

            #add lineage
            update_lineage(parsed_assembly, organism)

        except Exception as e:
            print(e)
            print(f"Impossible to save assembly {new_accession}, 'skipping it..")
            Chromosome.objects(metadata__assembly_accession=new_accession).delete()
            continue

    print(f"Job executed. Saved {saved_assemblies} out of {new_ids_length}")

##update chromosome list to assemblies
@shared_task(name='link_chromosomes',ignore_result=False)
def link_chromosomes():
    assemblies_accession_list = Assembly.objects(chromosomes__size=0)
    for assembly in assemblies_accession_list:
        related_chromosomes = Chromosome.objects(metadata__assembly_accession=assembly.accession).scalar('accession_version')
        if not related_chromosomes:
            continue
        assembly.chromosomes = related_chromosomes
        assembly.save()

@shared_task(name='assemblies_blob_link',ignore_result=False)
def add_blob_link():
    assemblies_accession_list = Assembly.objects(blobtoolkit_id=None).scalar('accession')
    for acc in assemblies_accession_list:
        response = get_blobtoolkit_id(acc)
        if len(response) and 'names' in response[0].keys() and len(response[0]['names']):
            ass = Assembly.objects(accession=acc).first()
            ass.blobtoolkit_id = response[0]['names'][0]
            ass.save()
