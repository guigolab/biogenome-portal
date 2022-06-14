##import data job
from services import organisms_service,experiment_service
from db.models import BioSample
from mongoengine.queryset.visitor import Q
from datetime import datetime, timedelta


SAMPLE_QUERY = Q(accession__ne=None) & (Q(last_check=None) | Q(last_check__lte=datetime.now()- timedelta(days=2)))



def update_samples():
    samples = BioSample.objects(SAMPLE_QUERY)
    if not samples:
        print('NO SAMPLES TO UPDATE')
        return
    print('SAMPLES TO UPDATE: ',len(samples))
    for sample in samples:
        organism = organisms_service.get_or_create_organism(sample.taxid)
        experiment_service.create_experiments(sample,organism)