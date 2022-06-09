from flask import json
from mongoengine.queryset.visitor import Q
from db.models import BioProject, TaxonNode,Organism
import os 
from flask import current_app as app

ROOT_NODE=os.getenv('ROOT_NODE')
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

def query_search(offset=0, limit=20, 
                sortOrder=None, sortColumn=None,
                taxName=ROOT_NODE, insdc_samples='false', 
                local_samples='false', assemblies='false', 
                experiments='false', annotations='false',filter=None, option=None, onlySelectedData='false', bioproject=PROJECT_ACCESSION):
    query=dict()
    json_resp=dict()     
    filter_query = get_query_filter(filter, option) if filter else None
    query['taxon_lineage'] = taxName
    if bioproject and not bioproject==PROJECT_ACCESSION:
        query['bioprojects'] = bioproject
    insdc_dict = dict(insdc_samples=insdc_samples,local_samples=local_samples,assemblies=assemblies,experiments=experiments,annotations=annotations)
    get_insdc_query(insdc_dict,query,onlySelectedData)
    organisms = Organism.objects(filter_query, **query).exclude('id') if filter_query else Organism.objects.filter(**query).exclude('id')
    if sortColumn:
        sort = '-'+sortColumn if sortOrder == 'true' else sortColumn
        organisms = organisms.order_by(sort)
    json_resp['total'] = organisms.count()
    json_resp['data'] = organisms[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)    

def get_insdc_query(insdc_dict, query, only_selected_data):
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
