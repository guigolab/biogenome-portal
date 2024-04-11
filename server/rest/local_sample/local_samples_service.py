from db.models import LocalSample,Organism,BioGenomeUser
from errors import NotFound
from ..organism import organisms_service
from datetime import datetime
from mongoengine.queryset.visitor import Q
from flask_jwt_extended import get_jwt

FIELDS_TO_EXCLUDE = ['id']

def get_local_samples(offset=0,limit=20,
                        filter=None,
                        sort_column=None,sort_order=None,
                        start_date=None, end_date=datetime.now(), user=None, parent_taxon=None):
    
    q_query= get_filter(filter) if filter else None
    b_query = {}
    
    if start_date:
        date_query = (Q(created__gte=start_date) & Q(created__lte=end_date))
        q_query = q_query & date_query if q_query else date_query


    if parent_taxon:
        b_query['taxid__in'] = Organism.objects(taxon_lineage=parent_taxon).scalar('taxid')

    if user:
        user_object = BioGenomeUser.objects(name=user).first()
        b_query['taxid__in'] = user_object.species

    if q_query:
        local_samples = LocalSample.objects(q_query, **b_query).exclude(*FIELDS_TO_EXCLUDE).skip(int(offset)).limit(int(limit))
    else:
        local_samples = LocalSample.objects(**b_query).exclude(*FIELDS_TO_EXCLUDE).skip(int(offset)).limit(int(limit))

    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        local_samples = local_samples.order_by(sort)

    return local_samples.count(), local_samples

def get_filter(filter):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'local_id':
        return (Q(local_id__iexact=filter) | Q(local_id__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))


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

