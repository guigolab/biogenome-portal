from db.models import  TaxonNode
from mongoengine.queryset.visitor import Q
from utils.helpers import data as data_helper
from errors import NotFound


FIELDS_TO_EXCLUDE=['id']

def get_taxons(args):
    filter = get_filter(args.get('filter'))
    selected_fields = [v for k, v in args.items(multi=True) if k.startswith('fields[]')]
    if not selected_fields:
        selected_fields = ['accession', 'scientific_name', 'taxid']
    return data_helper.get_items(args, 
                                 TaxonNode, 
                                 FIELDS_TO_EXCLUDE, 
                                 filter,
                                 selected_fields)

def get_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) |  (Q(name__iexact=filter) | Q(name__icontains=filter))
    return None

def get_taxon(taxid):
    taxon = TaxonNode.objects(taxid=taxid).first()
    if not taxon:
        raise NotFound
    return taxon

def get_taxon_children(taxid):
    taxon = get_taxon(taxid)
    children = TaxonNode.objects(taxid__in=[taxon.children])
    return children