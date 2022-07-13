from services import assembly
from utils.common_functions import query_search
from mongoengine.queryset.visitor import Q
from db.models import Annotation,Organism
import json
from utils import data_helper

ANNOTATION_FIELDS = ['name','taxid','assembly_accession','gff_gz_location','tab_index_location']



def create_annotation(data):
    if not 'assembly_accession' in data.keys():
        return
    assembly_obj = assembly.create_assembly_from_accession(data['assembly_accession'])
    annotation_obj = Annotation.objects(name = data['name']).first()
    if annotation_obj:
        return
    annotation_obj = Annotation(**data)
    annotation_obj.taxid = assembly_obj.taxid
    annotation_obj.save()
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