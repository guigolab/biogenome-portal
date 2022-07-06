from services.organisms_service import get_or_create_organism
from services import assembly_service
from utils.utils import get_annotations
from utils.common_functions import query_search, get_model_objects
from mongoengine.queryset.visitor import Q
from db.models import Annotation, AssemblyTrack,Organism
import json

ANNOTATION_FIELDS = ['name','taxid','assembly_accession','gff_gz_location','tab_index_location']

FIELDS_TO_EXCLUDE = ['id','created']

def get_query_filter(filter):
    return (Q(name__iexact=filter) | Q(name__icontains=filter))

def get_annotations(offset=0, limit=20, filter=None):
    if filter:
        query_filter = get_query_filter(filter)
        items = query_search(Annotation,FIELDS_TO_EXCLUDE,query_filter=query_filter)
    else:
        items = query_search(Annotation,FIELDS_TO_EXCLUDE)
    json_resp = dict()
    json_resp['total'] = items.count()
    json_resp['data'] = items[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)

def create_annotation(data):
    annotation_obj = Annotation(**data).save()

    ##create data here
    return annotation_obj

def update_annotation(name,data):
    annotation_obj = get_model_objects(dict(name=name)).first()
    annotation_obj.update(**data)
    return annotation_obj

def delete_annotation(name):
    annotation_obj = get_model_objects(Annotation, dict(name=name)).first()
    annotation_obj.delete()
    organism_to_update = get_model_objects(Organism,dict(annotations=name)).first()
    if organism_to_update:
        organism_to_update.modify(pull_annotations=name)
        organism_to_update.save()
    return name