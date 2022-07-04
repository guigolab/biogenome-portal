from __future__ import annotations
from utils.ncbi_client import get_assembly
from utils.utils import get_annotations
from mongoengine.queryset.visitor import Q
from db.models import Annotation, Assembly, AssemblyTrack,Organism
import json

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

def create_annotation_from_data(assembly_accession, annotation_data):
    assembly_obj = Assembly.objects(accession=assembly_accession).first()
    if not assembly_obj:
        #get assembly from NCBI
        ncbi_response = get_assembly(assembly_accession)
        if not 'assemblies' in ncbi_response.keys():
            return 'Assembly not found in NCBI'
        assembly_to_save = 

def query_search(offset=0, limit=20, filter=None):
    json_resp=dict()
    if filter:
        annotations = Annotation.objects(get_query_filter(filter)).exclude('id','created')
    else:
        annotations = Annotation.objects().exclude('id','created')
    json_resp['total'] = annotations.count()
    json_resp['data'] = list(annotations[int(offset):int(offset)+int(limit)].as_pymongo())

    return json.dumps(json_resp)  

def get_query_filter(filter):
    return (Q(name__iexact=filter) | Q(name__icontains=filter) | Q(targetGenome__icontains=filter) | Q(targetGenome__iexact=filter))

def delete_assembly(name):
    ann_to_delete = Annotation.objects(name=name).first()
    if not ann_to_delete:
        return
    #trigger eventual status change in organism
    organism_to_update = Organism.objects(annotations=name).first()
    if organism_to_update:
        organism_to_update.modify(pull_annotations=name)
        organism_to_update.save()
    return name