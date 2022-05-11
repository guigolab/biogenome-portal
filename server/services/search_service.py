from flask import json
from flask import current_app as app
from mongoengine.queryset.visitor import Q
from db.models import TaxonNode,Organism
from utils.common_functions import resolve_params
import os 

ROOT_NODE=os.getenv('ROOT_NODE')


DefaultParams = {
    'sortOrder': '',
    'sortColumn': '',
    'taxName': ROOT_NODE,
    'status': ' '
}
FilterParams = { **DefaultParams,
    'from': 0,
    'size': 20,
    'filter': '',
}

QueryParams = {
    **DefaultParams,
    'limit': 20,
    'offset': 0,
}
FILTER_OPTIONS=['species_name', 'taxid', 'common_name', 'tolid']

def query_search(offset=0, limit=20, 
                sortOrder=None, sortColumn=None,
                taxName=ROOT_NODE, insdc_samples='false', 
                local_samples='false', assemblies='false', 
                experiments='false', filter=None, option=None):
    query=dict()
    json_resp=dict()     
    filter_query = get_query_filter(filter, option) if filter else None
    tax_node = TaxonNode.objects(name=taxName).first()
    query['taxon_lineage'] = tax_node if tax_node else TaxonNode.objects(name=ROOT_NODE).first()
    insdc_dict = dict(insdc_samples=insdc_samples,local_samples=local_samples,assemblies=assemblies,experiments=experiments)
    get_insdc_query(insdc_dict,query)
    if filter_query:
        organisms = Organism.objects(filter_query, **query)
    else:
        organisms = Organism.objects.filter(**query)
    if sortColumn:
        sort = '-'+sortColumn if sortOrder == 'true' else sortColumn
        organisms = organisms.order_by(sort)
    json_resp['total'] = organisms.count()
    json_resp['data'] = organisms[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)    

def get_insdc_query(insdc_dict, query):
    values = insdc_dict.values()
    if all(value == 'true' for value in values) or all(value=='false' for value in values):
        return
    for key in insdc_dict.keys():
        if insdc_dict[key] == 'false':
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
##when filter is present we trigger FTS

def full_text_search(params,model):
    json_resp = {}
    resolved_params = resolve_params(FilterParams,**params)
    app.logger.info(resolved_params)
    # #tax name param always present, Eukaryota by default
    tax_node = TaxonNode.objects(name=resolved_params['taxName']).first()
    query_tax = query_by_taxNode(tax_node)
    query_status = query_by_status(resolved_params['status']) if resolved_params['status'] else None
    query = query_by_taxid(resolved_params['filter']) if resolved_params['filter'].isnumeric() else query_by_name(resolved_params['filter'])
    if query_status:
        organisms = model.objects(query_tax & query_status & query)
    else:
        organisms = model.objects(query_tax & query)
    if resolved_params['sortColumn']:
        sort = '-'+resolved_params['sortColumn'] if resolved_params['sortOrder'] == 'true' else resolved_params['sortColumn']
        organisms = organisms.order_by(sort)
    json_resp['total'] = organisms.count()
    json_resp['data'] = organisms[int(resolved_params['from']):int(resolved_params['from'])+int(resolved_params['size'])].as_pymongo()
    return json.dumps(json_resp)
