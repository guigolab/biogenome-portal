from db.models import  TaxonNode
from helpers import data as data_helper
from werkzeug.exceptions import NotFound

def get_taxon(taxid):
    taxon = TaxonNode.objects(taxid=taxid).first()
    if not taxon:
        raise NotFound(description=f"Taxon {taxid} not found!")
    return taxon

def get_taxon_children(taxid):
    taxon = get_taxon(taxid)
    children = TaxonNode.objects(taxid__in=taxon.children).exclude('id')
    return children

def get_ancestors(taxid):
    taxon = get_taxon(taxid)
    ancestors = [taxon.to_mongo().to_dict()]
    parent = TaxonNode.objects(children=taxid).exclude('id').first()
    while parent:
        ancestors.append(parent.to_mongo().to_dict())
        parent = TaxonNode.objects(children=parent.taxid).exclude('id').first()
    ancestors.reverse()
    # Filter out the root node (taxid = 1)
    ancestors = [ancestor for ancestor in ancestors if ancestor['taxid'] != '1']
    return data_helper.dump_json(ancestors)
    