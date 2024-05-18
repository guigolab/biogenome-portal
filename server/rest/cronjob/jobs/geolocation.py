from db.models import BioSample, SampleCoordinates, LocalSample
import os
from helpers.geolocation import update_countries_from_biosample,save_coordinates

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'
ROOT_NODE = os.getenv('ROOT_NODE')

def update_all_countries():
    biosamples = BioSample.objects()
    for biosample in biosamples:
        update_countries_from_biosample(biosample, biosample.accession)

    local_samples = LocalSample.objects()
    for local_sample in local_samples:
        update_countries_from_biosample(local_sample, local_sample.local_id)

def create_biosample_coordinates():
    biosamples = BioSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for biosample in biosamples:
        if biosample.accession in existing_coordinates:
            continue
        save_coordinates(biosample)

def create_local_sample_coordinates():
    local_samples = LocalSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for local_sample in local_samples:
        if local_sample.local_id in existing_coordinates:
            continue
        save_coordinates(local_sample,id_field='local_id')


