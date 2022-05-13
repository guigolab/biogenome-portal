from flask import json
from mongoengine.queryset.visitor import Q
from db.models import TaxonNode,Organism
import os 
from flask import current_app as app

ROOT_NODE=os.getenv('ROOT_NODE')



def query_search(offset=0, limit=20, 
                sortOrder=None, sortColumn=None,
                taxName=ROOT_NODE, insdc_samples='false', 
                local_samples='false', assemblies='false', 
                experiments='false', filter=None, option=None, onlySelectedData='false'):
    query=dict()
    json_resp=dict()     
    filter_query = get_query_filter(filter, option) if filter else None
    tax_node = TaxonNode.objects(name=taxName).first()
    query['taxon_lineage'] = tax_node if tax_node else TaxonNode.objects(name=ROOT_NODE).first()
    insdc_dict = dict(insdc_samples=insdc_samples,local_samples=local_samples,assemblies=assemblies,experiments=experiments)
    get_insdc_query(insdc_dict,query,onlySelectedData)
    organisms = Organism.objects(filter_query, **query) if filter_query else Organism.objects.filter(**query)
    if sortColumn:
        sort = '-'+sortColumn if sortOrder == 'true' else sortColumn
        organisms = organisms.order_by(sort)
    json_resp['total'] = organisms.count()
    json_resp['data'] = organisms[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)    

def get_insdc_query(insdc_dict, query, only_selected_data):
    values = insdc_dict.values()
    if all(value=='false' for value in values):
        return
    if only_selected_data == 'false':
        for key in insdc_dict.keys():
            if insdc_dict[key] == 'true':
                query[key+'__not__size'] = 0
    else:
        for key in insdc_dict.keys():
            if insdc_dict[key] == 'true':
                query[key+'__not__size'] = 0
            else:
                query[key] = []
    
def query_by_taxNode(taxNode,query):
    query['taxon_lineage'] = taxNode

def parse_pagination(offset,limit):
    if offset < 0:
        offset = 0
    if limit > 1000:
        limit = 1000

def get_query_filter(filter,option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'common_name':
        return (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter))
    elif option == 'tolid':
        return (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter))
    else:
        return (Q(organism__iexact=filter) | Q(organism__icontains=filter))
