from db.models import LocalSample
# from services import taxon_service
# from utils import ena_client
from mongoengine.queryset.visitor import Q
# from datetime import datetime
from utils import common_functions
from services import organisms_service
import json

FIELDS_TO_EXCLUDE = ['id','created','last_check']


def get_query_filter(filter):
    return (Q(local_id__iexact=filter) | Q(local_id__icontains=filter) | Q(scientific_name__icontains=filter))

def get_local_samples(offset=0, limit=20, filter=None):
    if filter:
        query_filter = get_query_filter(filter)
        items = common_functions.query_search(LocalSample,FIELDS_TO_EXCLUDE,query_filter=query_filter)
    else:
        items = common_functions.query_search(LocalSample,FIELDS_TO_EXCLUDE)
    json_resp = dict()
    json_resp['total'] = items.count()
    json_resp['data'] = items[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)

def delete_local_sample(id):
    sample_to_delete = LocalSample.objects(local_id=id).first()
    organism_to_update = organisms_service.get_or_create_organism(sample_to_delete.taxid)
    if organism_to_update:
        organism_to_update.modify(pull__local_samples=id)
        organism_to_update.save()
    sample_to_delete.delete()
    return id
