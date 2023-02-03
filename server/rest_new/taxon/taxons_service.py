from db.models import Organism, TaxonNode
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from errors import NotFound


def get_taxons(offset=0, limit=20,
                filter=None, rank=None):
    query=dict()
    if filter:
        filter_query = (Q(name__iexact=filter) | Q(name__icontains=filter))
    else:
        filter_query = None
    if rank:
        query['rank'] = rank
    if filter_query:
        taxons = TaxonNode.objects(filter_query, **query)
    else:
        taxons = TaxonNode.objects(**query)
    return taxons.count(), taxons[int(offset):int(offset)+int(limit)]

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
        node.leaves=Organism.objects(taxon_lineage=node.taxid, taxid__ne=node.taxid).count()
        node.save()

def bfs(root, nodes, max_leaves):
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


def dfs_generator(stack,tree,taxids):
    node, level = stack.pop(0)
    tree["name"] = node.name
    tree["taxid"] = node.taxid
    tree["children"] = []
    tree['rank'] = node.rank
    tree['leaves'] = node.leaves
    if node.children:
        children = TaxonNode.objects(taxid__in=node.children)
        for child in children:
            if not child.taxid in taxids:
                continue
            child_dict = {}
            dfs_generator([(child, level+1)], child_dict, taxids)
            tree["children"].append(child_dict)
    return tree

def dfs_all(stack,tree):
    node = stack.pop(0)
    tree["name"] = node["name"]
    tree["taxid"] = node["taxid"]
    tree["children"] = []
    tree['rank'] = node["rank"]
    tree['leaves'] = node["leaves"]
    if node["children"]:
        children = TaxonNode.objects(taxid__in=node["children"]).exclude('id').as_pymongo()
        for child in children:
            child_dict = {}
            dfs_all([child], child_dict)
            tree["children"].append(child_dict)
    return tree


def create_tree(taxid):
    node = TaxonNode.objects(taxid=taxid).exclude('id').first()
    # tree_iterator(node,tree)
    node_counts={}
    max_level = bfs(node,node_counts,150)
    app.logger.info(max_level)
    tree={}
    # dfs_all([node[0]],tree)
    dfs([(node,1)],tree,max_level)
    return tree
    # return tree, node_counts

def get_leaves_per_level(node, levels_obj):
    height = node["height"]
    if height in levels_obj.keys():
        levels_obj[height]+=1
    else:
        levels_obj[height]=1
    if "children" in node.keys():
        for child in node["children"]:
            get_leaves_per_level(child, levels_obj)
    return levels_obj

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

def generate_tree(data):
    taxids = data['taxids']
    organisms = Organism.objects(taxid__in=taxids)
    root = TaxonNode.objects(taxid= data['root']).first()
    #get root node
    lineages = [org.taxon_lineage for org in organisms]
    result = set().union(*lineages)
    tree = {}
    dfs_generator([(root,0)],tree,list(result))
    return tree
