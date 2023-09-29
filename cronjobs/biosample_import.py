from datetime import datetime
import os
from helpers import biosample_helper, cronjob_helper,taxonomy_helper, utils, sample_coordinates_helper
from db.models import BioSample,CronJob
from db.enums import CronJobStatus

from connect_to_db import connect_to_db, disconnect_from_db


PROJECTS = os.getenv('PROJECTS')
CRON_NAME = 'ebi_biosamples_import'
"""
STEPS:
    1) download all the biosamples under the project comma separated list variable PROJECTS 
    2) collect taxids and sample_accessions
    3) retrieve existing organisms
    4)

"""

def import_biosamples_from_bioproject_names():
    if not PROJECTS:
        return
    if not cronjob_helper.set_job(CRON_NAME):
        return
    try:
        for p in PROJECTS.split(','):
            ebi_biosamples = biosample_helper.retrieve_biosamples_from_ebi_by_project(p.strip())
            if not ebi_biosamples:
                print('No biosamples retrieved')
                print(f'skipping project {p}')
                continue
            print(f'a total of {len(ebi_biosamples)} found for project {p} ')
            taxids = set(str(sample['taxId']) for sample in ebi_biosamples)

            # create organisms and taxons
            taxonomy_helper.create_organisms_and_lineage(list(taxids))

            ebi_biosample_accessions = [sample['accession'] for sample in ebi_biosamples]
            existing_samples = utils.get_objects_by_scalar_id(BioSample,'accession',dict(accession__in=ebi_biosample_accessions))
            new_biosample_accessions = [accession for accession in ebi_biosample_accessions if not accession in existing_samples]
            if not new_biosample_accessions:
                print(f'no new biosamples found for project {p}')
                continue
            print(f'A total of {len(new_biosample_accessions)} new biosamples have been found')
            biosamples_to_save = [biosample_helper.parse_biosample_from_ebi_data(biosample) for biosample in ebi_biosamples if biosample['accession'] in new_biosample_accessions]

            parent_children_biosamples_map = biosample_helper.map_samples_by_relationship(biosamples_to_save)

            parent_samples = [biosample for biosample in biosamples_to_save if biosample.accession in parent_children_biosamples_map.keys()]

            for parent_sample in parent_samples:
                children = parent_children_biosamples_map.get(parent_sample.accession)
                parent_sample.sub_samples = [child.accession for child in children]

            print(f'A total of {len(biosamples_to_save)} is ready to be saved')
            saved_biosamples = utils.insert_data(BioSample, biosamples_to_save)
        
            print(f'A total of {len(saved_biosamples)} have been saved')
            #update organisms
            taxonomy_helper.update_organisms(parent_samples,'accession','biosamples',True)
            sample_coordinates_helper.create_coordinates_from_saved_biosamples(saved_biosamples)
            sample_coordinates_helper.update_countries_from_biosamples(saved_biosamples)
            #update biosamples by searching for sub samples
    except Exception as e:
        print('Error in execution',e)
    finally:
        cronjob_helper.terminate_job(CRON_NAME)
        
if __name__ == "__main__":
    print(f"Running import_biosamples at {datetime.now()}")
    connect_to_db()
    import_biosamples_from_bioproject_names()
    disconnect_from_db()
    #import biosamples from project tags
