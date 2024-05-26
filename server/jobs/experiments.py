from db.models import Read,Experiment
from clients import ebi_client
from parsers.experiment import parse_experiments_and_reads_from_ena_portal
from helpers.biosample import  handle_sample_accessions
from helpers.organism import update_organisms, handle_taxonomic_ids
import os
from celery import shared_task


PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

@shared_task(name='get_experiments', ignore_result=False)
def get_experiments_from_bioproject_accession():

    ebi_reads = ebi_client.get_reads(PROJECT_ACCESSION)

    if not ebi_reads:
        print(f"Experiments for project {PROJECT_ACCESSION} not found")
        return 
    
    experiments_to_save, reads_to_save = parse_experiments_and_reads_from_ena_portal(ebi_reads)
    
    if reads_to_save:
        print(f"Parsed reads {len(reads_to_save)}")
        existing_reads = Read.objects(run_accession__in=[r.run_accession for r in reads_to_save]).scalar('run_accession')
        new_reads_to_save = [r for r in reads_to_save if r.run_accession not in existing_reads]
        if new_reads_to_save:
            print(f"A total of {len(new_reads_to_save)} reads will be saved!")
            Read.objects.insert(new_reads_to_save)
    
    if experiments_to_save:
        existing_experiments = Experiment.objects(experiment_accession__in=[exp.experiment_accession for exp in experiments_to_save]).scalar('experiment_accession')
        new_experiments_to_save = [exp for exp in experiments_to_save if exp.experiment_accession not in existing_experiments]
        
        print(f"A total of {len(new_experiments_to_save)} new experiments have been found")

        new_experiments_to_save = handle_sample_accessions(handle_taxonomic_ids(new_experiments_to_save))

        if new_experiments_to_save:
            print(f"A total of {len(new_experiments_to_save)} new experiments will be saved")
            saved_experiments = Experiment.objects.insert(new_experiments_to_save)
            print(f"A total of {len(new_experiments_to_save)} new experiments have been saved")

            taxid_list_to_update = list(set(exp.taxid for exp in saved_experiments))  

            print(f"A total of {len(taxid_list_to_update)} organisms will be updated")

            update_organisms(taxid_list_to_update)

def remove_duplicates(documents):
    seen = set()
    return [d for d in documents if d.run_accession not in seen and not seen.add(d.run_accession)]
