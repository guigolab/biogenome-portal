from db.models import  TaxonNode
from mongoengine.queryset.visitor import Q
from helpers import data as data_helper
from werkzeug.exceptions import NotFound

def get_taxons(args):
    return data_helper.get_items('taxons', args)

def get_taxon(taxid):
    taxon = TaxonNode.objects(taxid=taxid).first()
    if not taxon:
        raise NotFound(description=f"Taxon {taxid} not found!")
    return taxon

def get_taxon_children(taxid):
    taxon = get_taxon(taxid)
    children = TaxonNode.objects(taxid__in=taxon.children).exclude('id')
    return children