from datetime import datetime
import os
from helpers import biosample_helper, cronjob_helper,experiment_helper,taxonomy_helper, utils
from db.models import BioSample,Experiment,CronJob
from db.enums import CronJobStatus
from connect_to_db import connect_to_db, disconnect_from_db

CRON_NAME='ebi_experiment_import'

def import_experiments():
    print('Importing experiments')
    if not cronjob_helper.set_job(CRON_NAME):
        return
    ##retrieve existing experiments
    try:
        existing_experiments_ids = utils.get_objects_by_scalar_id(Experiment,'experiment_accession')
        biosample_accessions = utils.get_objects_by_scalar_id(BioSample,'accession')
        if not biosample_accessions:
            print('No biosamples to query')
            return
        experiments_to_save = list()
        samples_to_update = list()
        for biosample_accession in biosample_accessions:
            related_experiments = experiment_helper.get_reads(biosample_accession)
            print(f'a total of {len(related_experiments)} for {biosample_accession} have been found')
            new_experiments = [new_exp for new_exp in related_experiments if not new_exp['experiment_accession'] in existing_experiments_ids]
            if not new_experiments:
                print(f'No experiments for sample {biosample_accession}')
                continue
            print(f'A total of {len(new_experiments)} experiments found for sample {biosample_accession}')
            experiments_to_save.extend(experiment_helper.parse_experiments_from_ena_response(new_experiments))
            samples_to_update.append(biosample_accession)
        
        if experiments_to_save:
            print(f'Saving a total of {len(experiments_to_save)} experiment')
            saved_experiments = utils.insert_data(Experiment, experiments_to_save)
            biosample_helper.add_data_to_biosamples(saved_experiments,samples_to_update,'push_all__experiments','experiment_accession')
            taxonomy_helper.update_organisms(saved_experiments,'experiment_accession','experiments',True)
        else:
            print('No saved experiments')
    except Exception as e:
        print('Error in execution',e)
    finally:
        CronJob.objects(cronjob_type=CRON_NAME).update(status=CronJobStatus.DONE)

if __name__ == "__main__":
    print(f"Running import_experiments at {datetime.now()}")
    connect_to_db()
    import_experiments()
    disconnect_from_db()
    #import biosamples from project tags
