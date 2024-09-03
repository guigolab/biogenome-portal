from db.models import Read,Experiment
from clients import ebi_client
from parsers.experiment import parse_experiment_and_read_from_ena_portal
from helpers.biosample import  handle_biosample
from helpers.organism import handle_organism
from helpers.data import update_lineage

import os
from celery import shared_task


PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

@shared_task(name='experiments_import', ignore_result=False)
def get_experiments_from_bioproject_accession():

    ebi_reads_generator = ebi_client.fetch_experiments_by_bioproject_streaming(PROJECT_ACCESSION)
    
    if not ebi_reads_generator:
        print(f"Experiments for project {PROJECT_ACCESSION} not found")
        return 
    
    saved_experiments_counter=0

    for read in ebi_reads_generator:
        experiment_to_save, read_to_save = parse_experiment_and_read_from_ena_portal(read)

        if read_to_save and not Read.objects(run_accession=read_to_save.run_accession):
            read_to_save.save()

        if experiment_to_save and not Experiment.objects(experiment_accession=experiment_to_save.experiment_accession):
            accession = experiment_to_save.experiment_accession
            try:

                print(f"fetching organism {experiment_to_save.taxid} and its related taxons for {accession}")
                organism = handle_organism(experiment_to_save.taxid)
                
                if not organism:
                    print(f"Any organism found for taxid: {experiment_to_save.taxid} of experiment {accession}")
                    print(f"Skipping experiment {accession}..")
                    raise Exception

                print(f"fetching biosample {experiment_to_save.sample_accession} of experiment {accession}")
                biosample = handle_biosample(experiment_to_save.sample_accession)

                if not biosample:
                    print(f"Any biosample found for accession: {experiment_to_save.sample_accession} of experiment {accession}")
                    print(f"Skipping experiment {accession}..")
                    raise Exception

                print(f"Saving experiment {experiment_to_save.experiment_accession}")
                experiment_to_save.save()
                saved_experiments_counter += 1 

                print(f"Updating organism {organism.scientific_name}")
                organism.save()

                #update lineage
                update_lineage(experiment_to_save, organism)

            except Exception as e:
                print(e)
                print(f"Impossible to save experiment {accession}, 'skipping it..")
                Read.objects(experiment_accession=accession).delete()
                continue

        
    print(f"A total of {saved_experiments_counter} new experiments have been saved")
