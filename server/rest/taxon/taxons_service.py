from db.models import Organism, TaxonNode, Assembly, Experiment, BioSample, LocalSample, GenomeAnnotation
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from errors import NotFound

FIELDS_TO_EXCLUDE=['id']


MODEL_MAPPER = {
    'assemblies':Assembly,
    'experiments':Experiment,
    'annotations':GenomeAnnotation,
    'biosamples':BioSample,
    'local_samples':LocalSample
}

def get_taxons(offset=0, limit=20,
                filter=None, rank=None, sort_column='', sort_order=''):
    
    q_query=None
    b_query={}

    if filter:
        q_query = (Q(name__iexact=filter) | Q(name__icontains=filter) | Q(taxid__iexact=filter) | Q(taxid__icontains=filter))

    if rank:
        b_query['rank'] = rank

    if q_query:
        taxons = TaxonNode.objects(q_query,**b_query).exclude(*FIELDS_TO_EXCLUDE).skip(int(offset)).limit(int(limit))
    else:
        taxons = TaxonNode.objects(**b_query).exclude(*FIELDS_TO_EXCLUDE).skip(int(offset)).limit(int(limit))

    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        taxons = taxons.order_by(sort)
    return taxons.count(), taxons

def get_taxon_coordinates(taxon):
    query = ( Q(locations__exists=True) & Q(locations__not__size=0) & Q(taxon_lineage=taxon.taxid))
    return Organism.objects(query).scalar('taxid','scientific_name','locations','image').exclude('id')


def create_taxons_from_lineage(lineage):
    taxon_lineage = []
    for node in lineage:
        if node['scientificName'] == 'root':
            continue
        taxon_node = TaxonNode.objects(taxid=node['taxId']).first()
        if not taxon_node:
            rank = node['rank'] if 'rank' in node.keys() else 'other'
            taxon_node = TaxonNode(taxid=node['taxId'], name=node['scientificName'], rank=rank).save()
        taxon_lineage.append(taxon_node)
    create_relationship(taxon_lineage)
    return taxon_lineage

def create_relationship(lineage):
    for index in range(len(lineage)-1):
        child_taxon = lineage[index]
        father_taxon = lineage[index + 1]
        father_taxon.modify(add_to_set__children=child_taxon.taxid)

def leaves_counter(lineage_list):
    for node in lineage_list:
        leaves = Organism.objects(taxon_lineage=node.taxid, taxid__ne=node.taxid).count()
        node.modify(leaves=leaves)

def get_children(taxid):
    taxon = TaxonNode.objects(taxid=taxid).exclude('id').first()
    if not taxon:
        raise NotFound
    if not taxon.children:
        return  json.loads(taxon.to_json())
    children = TaxonNode.objects(taxid__in=taxon.children).exclude('id')
    node = json.loads(taxon.to_json())
    node['children'] = json.loads(children.to_json())
    return node

def search_taxons(name=None,rank=None):
    if name:
        query = (Q(name__iexact=name) | Q(name__icontains=name))
        taxons = TaxonNode.objects(query)
    if rank:
        taxons = TaxonNode.objects(rank=rank)
    return taxons.to_json()


def get_taxon_related_data_stats(taxid):
    if not TaxonNode.objects(taxid=taxid):
        raise NotFound
    
    response = {}
    taxids = Organism.objects(taxon_lineage=taxid).scalar('taxid')
    for key,value in MODEL_MAPPER.items():
        response[key] = value.objects(taxid__in=taxids).count()
    return response