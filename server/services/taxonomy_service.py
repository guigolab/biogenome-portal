from db.models import Organism, TaxonNode
from flask import current_app as app
from utils.pipelines import TaxonPipeline
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from errors import NotFound

#expects lazy references
def delete_taxons(taxid_list):
    taxons = TaxonNode.objects(taxid__in=taxid_list)
    leaves_counter(taxons)
    for taxon in taxons:
        if taxon.leaves == 0:
            TaxonNode.objects(children=taxon.taxid).update_one(pull__children=taxon.taxid)
            Organism.objects(taxon_lineage=taxon.taxid).update(pull__taxon_lineage=taxon.taxid)
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

def bfs(root,nodes, max_leaves):
    queue = [(root,0)]
    while queue:
        node, level = queue.pop(0)
        if level == 0:
            nodes[level] = 1
        if node.children:
            children = TaxonNode.objects(taxid__in=node.children)
            for child in children:
                queue.append((child, level+1))
                nodes[level+1] = nodes.setdefault(level+1, 0) + 1
        if nodes[level] > max_leaves:
            return level-1

def dfs(stack, tree, max_level):
    node, level = stack.pop(0)
    tree["name"] = node.name
    tree["taxid"] = node.taxid
    tree["children"] = []
    tree['rank'] = node.rank
    tree['leaves'] = node.leaves
    if max_level and max_level <= level:
        return
    if node.children:
        children = TaxonNode.objects(taxid__in=node.children)
        for child in children:
            child_dict = {}
            dfs([(child, level+1)], child_dict, max_level)
            tree["children"].append(child_dict)
    return tree

def get_max_level(counts, limit):
    for level, nodes in counts.items():
        if nodes > limit:
            return level-1

def create_tree(taxid,max_leaves=250):
    node = TaxonNode.objects(taxid=taxid).first()
    node_counts={}
    max_level = bfs(node,node_counts,max_leaves)
    tree={}
    dfs([(node,0)],tree,max_level)
    return tree

# def get_children(taxid):
#     tax_node = TaxonNode.objects(taxid=taxid).aggregate(*TaxonPipeline).next()
#     tax_node['isOpen'] = True
#     for node in tax_node['children']:
#         node['isOpen'] = False
#     return tax_node          

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

def search_taxons(name):
    query = (Q(name__iexact=name) | Q(name__icontains=name))
    taxons = TaxonNode.objects(query).aggregate(*TaxonPipeline)
    return list(taxons)


