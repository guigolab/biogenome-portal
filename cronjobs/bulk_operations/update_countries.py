from datetime import datetime
import os
from helpers import cronjob_helper,sample_coordinates_helper
from db.models import BioSample,CronJob
from db.enums import CronJobStatus
from connect_to_db import connect_to_db, disconnect_from_db

CRON_NAME='update_countries'

def update_countries():
    if not cronjob_helper.set_job(CRON_NAME):
        return
    try:
        print('Updating countries')
        biosamples = BioSample.objects()
        if not biosamples:
            print('No biosamples are present in the db')
            return
        sample_coordinates_helper.update_countries_from_biosamples(biosamples)
        print('Countries updated')
    except Exception as e:
        print('Error in execution',e)
    finally:
        cronjob_helper.terminate_job(CRON_NAME)

if __name__ == "__main__":
    print(f"Running update_countries at {datetime.now()}")
    connect_to_db()
    update_countries()
    disconnect_from_db()
    #import biosamples from project tags
