from db.models import Organism
from mongoengine.queryset.visitor import Q
from helpers import data as data_helper

FIELDS_TO_EXCLUDE = ['id']

def get_status(args):
    filter = get_filter(args.get('filter'))
    return data_helper.get_items(args, 
                                 Organism, 
                                 filter,
                                 ['taxid', "scientific_name", "insdc_status", "goat_status", "target_list_status"])


def get_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter)) | (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter)) |(Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    return None