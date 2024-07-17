from db.models import Read,Experiment
from clients import ebi_client
from parsers.experiment import parse_experiments_and_reads_from_ena_portal
from helpers.biosample import  handle_biosample
from helpers.organism import handle_organism
import os
from celery import shared_task


PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

@shared_task(name='get_experiments', ignore_result=False)
def get_experiments_from_bioproject_accession():

    ebi_reads = ebi_client.fetch_experiments_by_bioproject_streaming(PROJECT_ACCESSION)
    if not ebi_reads:
        print(f"Experiments for project {PROJECT_ACCESSION} not found")
        return 
    
    experiments_to_save, parsed_reads = parse_experiments_and_reads_from_ena_portal(ebi_reads)
    
    ##BULK INSERT NEW READS
    if parsed_reads:

        read_accession_list=[r.run_accession for r in parsed_reads]

        existing_reads = Read.objects(run_accession__in=read_accession_list).scalar('run_accession')
        new_reads_to_save = [r for r in parsed_reads if r.run_accession not in existing_reads]
        
        if new_reads_to_save:

            print(f"A total of {len(new_reads_to_save)} reads will be saved!")

            Read.objects.insert(new_reads_to_save)

            print(f"Reads {len(new_reads_to_save)} saved!")

    #Iterate over experiments        
    if experiments_to_save:
        experiment_accession_list=[exp.experiment_accession for exp in experiments_to_save]
        existing_experiments = Experiment.objects(experiment_accession__in=experiment_accession_list).scalar('experiment_accession')
        
        new_experiments_to_save = [exp for exp in experiments_to_save if exp.experiment_accession not in existing_experiments]
        
        print(f"A total of {len(new_experiments_to_save)} new experiments have been found")
        
        saved_experiments_counter=0
        for new_experiment_to_save in new_experiments_to_save:
            accession = new_experiment_to_save.experiment_accession
            try:

                print(f"fetching organism {new_experiment_to_save.taxid} and its related taxons for {accession}")
                organism = handle_organism(new_experiment_to_save.taxid)
                
                if not organism:
                    print(f"Any organism found for taxid: {new_experiment_to_save.taxid} of experiment {accession}")
                    print(f"Skipping experiment {accession}..")
                    continue

                print(f"fetching biosample {new_experiment_to_save.sample_accession} of experiment {accession}")
                biosample = handle_biosample(new_experiment_to_save.sample_accession)

                if not biosample:
                    print(f"Any biosample found for accession: {new_experiment_to_save.sample_accession} of experiment {accession}")
                    print(f"Skipping experiment {accession}..")
                    continue

                print(f"Saving experiment {new_experiment_to_save.experiment_accession}")
                new_experiment_to_save.save()
                saved_experiments_counter += 1 

                print(f"Updating organism {organism.scientific_name}")
                organism.save()

            except Exception as e:
                print(e)
                print(f"Impossible to save experiment {accession}, 'skipping it..")
                Read.objects(experiment_accession=accession).delete()
                continue
        
        print(f"A total of {saved_experiments_counter} out of {len(new_experiments_to_save)} new experiments have been saved")
