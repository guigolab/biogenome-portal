from db.models import  TaxonNode
from mongoengine.queryset.visitor import Q
from helpers import data as data_helper
from errors import NotFound


FIELDS_TO_EXCLUDE=['id']

def get_taxons(args):
    filter = get_filter(args.get('filter'))
    return data_helper.get_items(args, 
                                 TaxonNode, 
                                 filter,
                                 ['taxid', 'scientific_name', 'rank'])

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
    children = TaxonNode.objects(taxid__in=taxon.children)
    return children