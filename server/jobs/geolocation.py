from db.models import BioSample, SampleCoordinates, LocalSample
import os
from helpers.geolocation import update_countries_from_biosample,save_coordinates
from celery import shared_task


PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'


@shared_task(name='geo_locations_create_countries', ignore_result=False)
def update_all_countries():
    biosamples = BioSample.objects()
    for biosample in biosamples:
        update_countries_from_biosample(biosample, biosample.accession)

    local_samples = LocalSample.objects()
    for local_sample in local_samples:
        update_countries_from_biosample(local_sample, local_sample.local_id)

@shared_task(name='geo_locations_create_from_biosample', ignore_result=False)
def create_biosample_coordinates():
    biosamples = BioSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for biosample in biosamples:
        if biosample.accession in existing_coordinates:
            continue
        save_coordinates(biosample)


@shared_task(name='geo_locations_create_from_local_samples', ignore_result=False)
def create_local_sample_coordinates():
    local_samples = LocalSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for local_sample in local_samples:
        if local_sample.local_id in existing_coordinates:
            continue
        save_coordinates(local_sample,id_field='local_id')


