from db.models import TaxonNode,Organism, SecondaryOrganism
from flask import current_app as app
# from mongoengine.queryset.visitor import Q
## create a service to retrieve lineage from taxon_id and create taxon_nodes from that
## check http://etetoolkit.org/docs/latest/tutorial/tutorial_ncbitaxonomy.html

RANKS = ['root','superkingdom','kingdom','phylum','subphylum','class','order','family','genus','species','subspecies']
LINEAGE_KEY = 'lineage_list'
DTOL_LIMIT=100


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


def leaves_counter(lineage_list):
    for node in lineage_list:
        tax_node = node.fetch()
        tax_node.leaves=count_species(tax_node)
        tax_node.save()

def create_taxons(lineage):
    taxon_lineage = []
    for node in lineage:
        taxon = node['$']
        if ('rank' in taxon.keys() and taxon['rank'] in RANKS) or taxon['taxId'] == 1:
            taxon_node = TaxonNode.objects(taxonId=taxon['taxId']).first()
            if not taxon_node:
                taxon_node = TaxonNode(taxonId=taxon['taxId'], name=taxon['scientificName'], rank=taxon['rank']).save()
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

def count_species(tax_node):
    leaves = 0
    if not tax_node:
        return 0
    elif len(tax_node.children) == 0:
        return 1
    else:
        for child in [lazy_ref.fetch() for lazy_ref in tax_node.children]:
            leaves += count_species(child)
        return leaves

def bfs(root,nodes):
    queue = [(root,0)]
    while queue:
        node, level = queue.pop(0)
        if level == 0:
            nodes[level] = 1
        if node.children:
            for child in node.children:
                queue.append((child, level+1))
                nodes[level+1] = nodes.setdefault(level+1, 0) + 1
        if nodes[level] > DTOL_LIMIT:
            return level-1

def dfs(stack, tree, max_level):
    node, level = stack.pop(0)
    tree["name"] = node.name
    tree["isOpen"] = True
    tree["children"] = []
    tree['rank'] = node.rank
    tree['leaves'] = node.leaves
    if max_level and max_level <= level:
        return
    if node.children:
        childrens = [lazy_ref.fetch() for lazy_ref in node.children]
        for child in childrens:
            child_dict = {}
            dfs([(child, level+1)], child_dict, max_level)
            tree["children"].append(child_dict)
    return tree

def get_max_level(counts, limit):
    for level, nodes in counts.items():
        if nodes > limit:
            return level-1

def create_tree(node):
    node_counts={}
    max_level = bfs(node,node_counts)
    tree={}
    dfs([(node,0)],tree,max_level)
    return tree