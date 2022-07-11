from __future__ import annotations
from utils.common_functions import query_search
from mongoengine.queryset.visitor import Q
from services import assembly,annotation
from db.models import Annotation,Organism
import json
from utils import data_helper

ANNOTATION_TRACK_FIELDS = ['name','gff_gz_location','tab_index_location']

def create_jbrowse_tracks(assembly_accession,data):
    ass_obj = assembly.create_assembly_from_accession(assembly_accession)
    assembly_track = assembly.create_assembly_track(data)
    if assembly_track:
        ass_obj.track = assembly_track
    if 'annotations' in data.keys():
        for ann in data['annotations']:
            annotation.create_annotation(**ann)



    


def create_annotation(data):
    annotation_obj = Annotation(**data).save()
    data_helper.create_data_from_annotation(annotation_obj)
    ##create data here
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