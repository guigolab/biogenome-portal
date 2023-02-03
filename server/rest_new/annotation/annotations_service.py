from services import assembly_service
from mongoengine.queryset.visitor import Q
from db.models import Annotation,Organism
from utils import data_helper

ANNOTATION_FIELDS = ['name','taxid','assembly_accession']

def get_annotations(filter=None, offset=0, limit=20):
    if filter:
        annotations = Annotation.objects(Q(name__iexact=filter) | Q(name__icontains=filter))
    else:
        annotations = Annotation.objects()
    return annotations.count(), annotations[int(offset):int(offset)+int(limit)]

def create_annotation(data):
    resp_obj=dict()
    if not 'assembly_accession' in data.keys():
        resp_obj['message'] = 'assembly_accession field is mandatory'
        resp_obj['status'] = 400
        return resp_obj
    assembly_accession = data['assembly_accession']
    assembly_obj = assembly_service.create_assembly_from_accession(data['assembly_accession'])
    if not assembly_obj:
        resp_obj['message'] = f'{assembly_accession} not found in INSDC'
        resp_obj['status'] = 400
        return resp_obj
    annotation_name = data['name']
    annotation_obj = Annotation.objects(name = annotation_name).first()
    if annotation_obj:
        resp_obj['message'] = f"{annotation_name} already exists, change it or update the existing"
        resp_obj['status'] = 400
        return resp_obj
    annotation_obj = Annotation(**data)
    annotation_obj.taxid = assembly_obj.taxid
    annotation_obj.save()
    data_helper.create_data_from_annotation(annotation_obj)
    resp_obj['message'] = f'{annotation_obj.name} correctly saved'
    resp_obj['status'] = 201
    return resp_obj

def update_annotation(name,data):
    annotation_obj = Annotation.objects(name=name).first()
    annotation_obj.update(**data)
    return annotation_obj

def delete_annotation(name):
    annotation_obj = Annotation.objects(name=name).first()
    annotation_obj.delete()
    organism_to_update = Organism.objects(annotations=name).first()
    if organism_to_update:
        organism_to_update.modify(pull__annotations=name)
        organism_to_update.save()
    return name