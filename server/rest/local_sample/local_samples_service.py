from db.models import LocalSample
from errors import NotFound
from mongoengine.queryset.visitor import Q
from utils.helpers import user as user_helper, organism as organism_helper, data as data_helper

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

def get_local_sample(id):
    sample = LocalSample.objects(local_id=id).exclude(*FIELDS_TO_EXCLUDE).first()
    if not sample:
        raise NotFound
    return sample

def delete_local_sample(id):
    user = user_helper.get_current_user()
    if not user:
        raise NotFound
    
    sample_to_delete = get_local_sample(id)
    
    if user.role.value == 'DataManager' and not sample_to_delete.taxid in user.species:
        raise NotFound
    
    taxid = sample_to_delete.taxid
    sample_to_delete.delete()
    organism = organism_helper.handle_organism(taxid)
    if organism:
        organism.save()
    return id


