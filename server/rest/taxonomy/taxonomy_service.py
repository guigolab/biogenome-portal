from db.models import Organism, TaxonNode
from flask import current_app as app

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

def create_tree(taxid, limit=None):
    node = TaxonNode.objects(taxid=taxid).exclude('id').first()
    # tree_iterator(node,tree)
    node_counts={}
    if limit:
        max_level = bfs(node,node_counts,int(limit))
    else:
        max_level = None
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

#params we expect
#   
#   list of taxids
#   root taxid
#   insdc status
#   goat status
#
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

def generate_status_tree(taxid, status_type='insdc_status', status=None):
    root = TaxonNode.objects(taxid=taxid).first()
    result=list()
    # if status:
    #     query=dict(taxon_lineage=taxid)
    #     query[status_type]=status
    #     lineages = Organism.objects(**query).scalar('taxon_lineage')
    #     result = list(set().union(*lineages))
    tree = {}
    dfs_status_tree([(root,0)], tree)
    return tree

def dfs_status_tree(stack, tree):
    node, level = stack.pop(0)
    tree["name"] = node.name
    tree["taxid"] = node.taxid
    tree["children"] = []
    tree['rank'] = node.rank
    tree['leaves'] = node.leaves
    if node.children:
        children = TaxonNode.objects(taxid__in=node.children)
        for child in children:
            child_dict = {}
            dfs_status_tree([(child, level+1)], child_dict,valid_lineages_taxid)
            tree["children"].append(child_dict)
    return tree