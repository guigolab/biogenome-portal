from db.models import LocalSample
from mongoengine.queryset.visitor import Q
from services import organism
from utils import common_functions
import json


def delete_local_sample(id):
    sample_to_delete = LocalSample.objects(local_id=id).first()
    organism_to_update = organism.get_or_create_organism(sample_to_delete.taxid)
    if organism_to_update:
        organism_to_update.modify(pull__local_samples=id)
        organism_to_update.save()
    sample_to_delete.delete()
    return id
