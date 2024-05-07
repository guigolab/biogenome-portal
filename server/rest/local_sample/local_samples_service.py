from db.models import LocalSample,Organism,BioGenomeUser
from errors import NotFound
from ..organism import organisms_service
from datetime import datetime
from mongoengine.queryset.visitor import Q
from flask_jwt_extended import get_jwt
from ..utils import data_helper

FIELDS_TO_EXCLUDE = ['id']

def get_local_samples(args):
    
    filter = get_filter(args.get('filter'))
    selected_fields = [v for k, v in args.items(multi=True) if k.startswith('fields[]')]
    if not selected_fields:
        selected_fields = ['local_id', 'scientific_name', 'taxid']
    return data_helper.get_items(args, 
                                 LocalSample, 
                                 FIELDS_TO_EXCLUDE, 
                                 filter,
                                 selected_fields)


def get_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(local_id__iexact=filter) | Q(local_id__icontains=filter)) |  (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    else:
        return None

def delete_local_sample(id):
    claims = get_jwt()
    name = claims.get('username')
    user = BioGenomeUser.objects(name=name).first()
    if not user:
        raise NotFound
    
    sample_to_delete = LocalSample.objects(local_id=id).first()
    if not sample_to_delete:
        raise NotFound
    
    if user.role.value == 'DataManager' and not sample_to_delete.taxid in user.species:
        raise NotFound
    
    sample_to_delete.delete()
    organism = Organism.objects(taxid=sample_to_delete.taxid).first()
    organism.save()
    return id

def create_local_sample(data):
    #mandatory keys
    required_fields = ['local_id','taxid','metadata']
    for f in required_fields:
        if not f in data.keys():
            return dict(message=f"{f} is mandatory"), 400
    local_sample_obj = LocalSample.objects(local_id=data['local_id']).first()
    if local_sample_obj:
        return dict(message=f"local sample with id: {data['local_id']} already exists"), 400

    org = organisms_service.get_or_create_organism(data['taxid'])
    if not org:
        return dict(message=f"{data['taxid']} not found"), 400

    local_sample_obj = LocalSample(local_id=data['local_id'], taxid=data['taxid'])

    saved_sample = parse_local_sample_metadata(local_sample_obj, org, data['metadata'])

    return dict(message=f"{saved_sample.local_id} correctly saved"), 201

def update_local_sample(local_id, data):
    local_sample_obj = LocalSample.objects(local_id = local_id).first()
    if not local_sample_obj:
        raise NotFound
    updated_sample = parse_local_sample_metadata(local_sample_obj, data)
    return dict(message=f"{updated_sample.local_id} correctly updated"), 201

def parse_local_sample_metadata(sample, metadata):
    sample.metadata = dict(**metadata)
    sample.save()
    return sample

