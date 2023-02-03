from db.models import Organism, TaxonNode
from mongoengine.queryset.visitor import Q
import json
from flask import current_app as app
from errors import NotFound

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

def create_tree(taxid):
    node = TaxonNode.objects(taxid=taxid).exclude('id').first()
    # tree_iterator(node,tree)
    node_counts={}
    max_level = bfs(node,node_counts,150)
    app.logger.info(max_level)
    tree={}
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
