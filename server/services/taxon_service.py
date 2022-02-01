from db.models import TaxonNode,Organism, SecondaryOrganism
from flask import current_app as app
# from mongoengine.queryset.visitor import Q
## create a service to retrieve lineage from taxon_id and create taxon_nodes from that
## check http://etetoolkit.org/docs/latest/tutorial/tutorial_ncbitaxonomy.html

RANKS = ['root','superkingdom','kingdom','phylum','subphylum','class','order','family','genus','species','subspecies']
LINEAGE_KEY = 'lineage_list'
DTOL_LIMIT=90


def create_data(data):
    taxon = data['taxon']
    sample = SecondaryOrganism(taxonId = int(data['taxonId']) , metadata=data['fields']).save() ###save sample here
    taxid = sample.taxonId
    organism = Organism.objects(taxonId = taxid).first()
    if not organism:
        lineage = taxon['lineage'][0]['taxon']
        tax_node = {'$': taxon['$']}
        lineage.insert(0,tax_node)
        taxon_lineage = create_taxons(lineage)
        create_children(taxon_lineage)
        organism = Organism(taxonId=taxid, name = taxon['$']['scientificName'], taxon_lineage=taxon_lineage)
        leaves_counter(organism.taxon_lineage)
    organism.samples.append(sample)
    organism.save()
    return sample    



def create_taxons(lineage):
    taxon_lineage = []
    for node in lineage:
        if ('rank' in node.keys() and node['rank'] in RANKS) or node['taxId'] == 1:
            taxon_node = TaxonNode.objects(taxid=node['taxId']).first()
            if not taxon_node:
                taxon_node = TaxonNode(taxid=node['taxId'], name=node['scientificName'], rank=node['rank']).save()
            taxon_lineage.append(taxon_node)
    return taxon_lineage

def create_children(lineage):
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

