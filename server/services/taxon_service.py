from db.models import TaxonNode,Organism, SecondaryOrganism
from flask import current_app as app
from utils import ena_client, utils, constants
# from mongoengine.queryset.visitor import Q
## create a service to retrieve lineage from taxon_id and create taxon_nodes from that
## check http://etetoolkit.org/docs/latest/tutorial/tutorial_ncbitaxonomy.html

RANKS = constants.RANKS
LINEAGE_KEY = 'lineage_list'
DTOL_LIMIT=90


#this service is the interface between mongo and the client
def get_taxon(taxid):
    taxon = ena_client.get_taxon(taxid)
    lineage = utils.parse_taxon(taxon)
    species = lineage[0]
    taxon_lineage = create_taxons_from_lineage(lineage)
    create_relationship(taxon_lineage)
    common_name = species['commonName'] if 'commonName' in species.keys() else ''
    organism = Organism(organism=species['scientificName'],taxid=species['taxId'], commonName = common_name,taxon_lineage=taxon_lineage).save()
    lineage_nodes = TaxonNode.objects(id__in=[lz_ref.id for lz_ref in organism.taxon_lineage])
    leaves_counter(lineage_nodes)
    return organism

def delete_taxons(taxid_list):
    length = len(TaxonNode.objects(taxid__in=taxid_list))
    TaxonNode.objects(taxid__in=taxid_list).delete()
    return length

def create_taxons_from_lineage(lineage):
    taxon_lineage = []
    for node in lineage:
        if ('rank' in node.keys() and node['rank'] in RANKS) or node['taxId'] == 1:
            taxon_node = TaxonNode.objects(taxid=node['taxId']).first()
            if not taxon_node:
                taxon_node = TaxonNode(taxid=node['taxId'], name=node['scientificName'], rank=node['rank']).save()
            taxon_lineage.append(taxon_node)
    #create relationship
    create_relationship(lineage)
    return taxon_lineage

def create_relationship(lineage):
    for index in range(len(lineage)-1):
        child_taxon = lineage[index]
        father_taxon = lineage[index + 1]
        if not any(child_node.id == child_taxon.id for child_node in father_taxon.children):
            father_taxon.children.append(child_taxon)
            father_taxon.save()
        else:
            continue

def leaves_counter(lineage_list):
    for node in lineage_list:
        node.leaves=count_species(node)
        node.save()

def count_species(tax_node):
    leaves = 0
    if not tax_node:
        return 0
    elif len(tax_node.children) == 0:
        return 1
    else:
        children = TaxonNode.objects(id__in=[lz_ref.id for lz_ref in tax_node.children])
        for child in children:
            leaves += count_species(child)
        return leaves

