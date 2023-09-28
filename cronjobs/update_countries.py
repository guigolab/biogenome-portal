from datetime import datetime
import os
from helpers import sample_coordinates_helper
from db.models import BioSample
from connect_to_db import connect_to_db, disconnect_from_db


def update_countries():
    print('Updating countries')
    biosamples = BioSample.objects()
    if not biosamples:
        print('No biosamples are present in the db')
        return
    sample_coordinates_helper.update_countries_from_biosamples(biosamples)
    print('Countries updated')
    ##retrieve existing experiments


if __name__ == "__main__":
    print(f"Running update_countries at {datetime.now()}")
    connect_to_db()
    update_countries()
    disconnect_from_db()
    #import biosamples from project tags
