from db.models import Organism, TaxonNode
from flask import current_app as app
from utils.pipelines import TaxonPipeline

#expects lazy references
def delete_taxons(taxid_list):
    taxons = TaxonNode.objects(taxid__in=taxid_list)
    leaves_counter(taxons)
    for taxon in taxons:
        if taxon.leaves == 0:
            TaxonNode.objects(children=taxon.id).update_one(pull__children=taxon.id)
            Organism.objects(taxon_lineage=taxon.id).update(pull__taxon_lineage=taxon.id)
            taxon.delete()

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
        # node.leaves=count_species(node)
        node.leaves=Organism.objects(taxon_lineage=node.taxid, taxid__ne=node.taxid).count()
        node.save()

def bfs(node, nodes):
    queue = [(node,0)]
    while queue:
        node, level = queue.pop(0)
        if level == 0:
            nodes[level] = 1
        if node.children:
            for child in TaxonNode.objects(taxid__in=node.children):
                queue.append((child, level+1))
                nodes[level+1] = nodes.setdefault(level+1, 0) + 1
    return nodes
    
def dfs(stack, tree):
    node, level = stack.pop(0)
    tree["name"] = node.name
    tree["children"] = []
    tree['rank'] = node.rank
    tree['leaves'] = node.leaves
    if node.children:
        children = TaxonNode.objects(taxid__in=node.children)
        for child in children:
            child_dict = {}
            dfs([(child, level+1)], child_dict)
            tree["children"].append(child_dict)
    return tree

def get_max_level(counts, limit):
    for level, nodes in counts.items():
        if nodes > limit:
            return level-1

def get_levels(taxid):
    root = TaxonNode.objects(taxid=taxid).first()
    return bfs(root, dict())


def create_tree(taxid, maxLeaves=None):
    root = TaxonNode.objects(taxid=taxid).first()
    tree = dict()
    dfs([(root,0)],tree)
    return tree

    # tree = append_children(root, dict())
    # return tree

def get_children(taxid):
    tax_node = TaxonNode.objects(taxid=taxid).aggregate(*TaxonPipeline).next()
    tax_node['isOpen'] = True
    for node in tax_node['children']:
        node['isOpen'] = False
    return tax_node          