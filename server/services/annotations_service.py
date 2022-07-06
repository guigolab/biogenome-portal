from services.organisms_service import get_or_create_organism
from services import assembly_service
from utils.utils import get_annotations
from utils.common_functions import query_search
from mongoengine.queryset.visitor import Q
from db.models import Annotation, AssemblyTrack,Organism
import json

ANNOTATION_FIELDS = ['name','taxid','assembly_accession','gff_gz_location','tab_index_location']

FIELDS_TO_EXCLUDE = ['id','created']

def parse_annotation_from_portal(organism_obj, ass_obj):
    response = get_annotations(organism_obj.scientific_name)
    if not response or not 'annotations' in response.keys():
        return
    for ann in response['annotations']:
        if ass_obj.assembly_name == ann['targetGenome'] and not Annotation.objects(name=ann['name']).first():
            annotation = Annotation(taxid=organism_obj.taxid,**ann).save()
            ##save assembly track
            for ass in response['genomes']:
                if ass['name'] == ass_obj.assembly_name:
                    ass_track = AssemblyTrack(**ass)
                    ass_obj.modify(track=ass_track)
            organism_obj.modify(add_to_set__annotations=annotation.name) 

def create_annotation_from_data(annotation_data):
    for field in ANNOTATION_FIELDS:
        if field not in annotation_data.keys():
            return 
    assembly_accession = annotation_data['assembly_accession']
    assembly_obj = assembly_service.get_or_create_assembly(assembly_accession)
    ##check if annotation exists
    if not assembly_obj:
        return  
    annotation_obj = Annotation(name=annotation_data['name']).first()
    if annotation_obj:
        return 
    ann_metadata = dict()
    ann_fields = dict()
    for key in annotation_data.keys():
        if key not in ANNOTATION_FIELDS:
            ann_metadata[key] = annotation_data[key]
        else:
            ann_fields[key] = annotation_data[key]
    annotation_obj = Annotation(assembly_accession=assembly_accession,metadata=ann_metadata, **ann_fields).save()
    organism = get_or_create_organism(annotation_obj.taxid)
    organism.modify(add_to_set__annotations=annotation_obj.name)
    organism.save()
    return annotation_obj

def get_annotation_objects(query):
    return Annotation.objects(**query)

def get_query_filter(filter):
    return (Q(name__iexact=filter) | Q(name__icontains=filter) | Q(targetGenome__icontains=filter) | Q(targetGenome__iexact=filter))

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

def create_annotation(data,import_related=False):
    annotation_obj = Annotation(**data).save()
    return annotation_obj

def update_annotation(name,data):
    annotation_obj = Annotation.objects(name=name).first()
    annotation_obj.update(**data)
    return annotation_obj

def delete_annotation(name):
    annotation_obj = Annotation.objects(name=name).first()
    annotation_obj.delete()
    organism_to_update = Organism.objects(annotations=name).first()
    if organism_to_update:
        organism_to_update.modify(pull_annotations=name)
        organism_to_update.save()
    return name