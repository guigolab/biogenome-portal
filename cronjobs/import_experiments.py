from datetime import datetime
from connect_to_db import connect_to_db, disconnect_from_db
import os
from db.models import Assembly,Organism,BioSample,Chromosome
from helpers import assembly_helper,biosample_helper,taxonomy_helper, utils

DATASETS = '/ncbi/datasets'



def import_experiments(accession):
    import_experiments = 'bla'


if __name__ == "__main__":
    connect_to_db()
    print(f"Running import_experiments at {datetime.now()}")
    disconnect_from_db()


