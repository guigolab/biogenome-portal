from db.models import Read,Experiment
from clients import ebi_client
from parsers.experiment import parse_experiments_and_reads_from_ena_portal
from helpers.biosample import handle_biosample
from helpers.organism import handle_organism
import os

PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

def get_experiments_from_bioproject_accession():

    ebi_reads = ebi_client.get_reads(PROJECT_ACCESSION)
    if not ebi_reads:
        print(f"Experiments for project {PROJECT_ACCESSION} not found")
    
    experiments_to_save, reads_to_save = parse_experiments_and_reads_from_ena_portal(ebi_reads)
    
    if reads_to_save:
        existing_reads = Read.objects(run_accession__in=[r.run_accession for r in reads_to_save]).scalar('run_accession')
        new_reads_to_save = [r for r in reads_to_save if r.run_accession not in existing_reads]
        print(f"A total of {len(new_reads_to_save)} reads will be saved!")
        Read.objects.insert(new_reads_to_save)
    
    if experiments_to_save:
        existing_experiments = Experiment.objects(experiment_accession__in=[exp.experiment_accession for exp in experiments_to_save])
        new_experiments_to_save = [exp for exp in experiments_to_save if exp.experiment_accession not in existing_experiments]
        
        print(f"A total of {len(new_experiments_to_save)} experiments will be saved")

        for new_experiment_to_save in new_experiments_to_save:
            organism = handle_organism(new_experiment_to_save.taxid)
            if not organism:
                print(f"Organism with taxid {new_experiment_to_save.taxid} not found in INDSC, skipping experiment {new_experiment_to_save.experiment_accession}")
                continue
            
            biosample = handle_biosample(new_experiment_to_save.sample_accession)
            if not biosample:
                print(f"Biosample with accession {new_experiment_to_save.sample_accession} not found in INDSC, skipping experiment {new_experiment_to_save.experiment_accession}")

            new_experiment_to_save.save()
            organism.save()
