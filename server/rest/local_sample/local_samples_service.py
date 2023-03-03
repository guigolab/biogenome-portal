from db.models import LocalSample
from errors import NotFound
from ..organism import organisms_service
from flask import current_app as app
from datetime import datetime
from mongoengine.queryset.visitor import Q


def get_local_samples(offset=0,limit=20,
                        filter=None, filter_option="scientific_name",
                        sort_column=None,sort_order=None,
                        start_date=None, end_date=datetime.utcnow):
    if filter:
        filter_query= get_filter(filter,filter_option)
    else:
        filter_query = None
    if start_date:
        date_query = (Q(created__gte=start_date) & Q(created__lte=end_date))
    else:
        date_query = None
    if filter_query and date_query:
        local_samples = LocalSample.objects(filter_query,date_query).exclude('id','created')
    elif filter_query:
        local_samples = LocalSample.objects(filter_query).exclude('id','created')
    elif date_query:
        local_samples = LocalSample.objects(date_query).exclude('id','created')
    else:
        local_samples = LocalSample.objects().exclude('id','created')
    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        local_samples = local_samples.order_by(sort)
    return local_samples.count(), local_samples[int(offset):int(offset)+int(limit)]

def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))


def delete_local_sample(id):
    sample_to_delete = LocalSample.objects(local_id=id).first()
    if not sample_to_delete:
        raise NotFound
    sample_to_delete.delete()
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
    organism = organisms_service.get_or_create_organism(local_sample_obj.taxid)
    updated_sample = parse_local_sample_metadata(local_sample_obj, organism, data)
    return dict(message=f"{updated_sample.local_id} correctly updated"), 201

def parse_local_sample_metadata(sample, organism, metadata):
    sample.metadata = dict(**metadata)
    sample.save()
    return sample

