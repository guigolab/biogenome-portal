from db.models import TaxonNode
from flask import current_app as app

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

def create_tree(taxid, levels=False):
    root = TaxonNode.objects(taxid=taxid).first()
    tree = dict()
    dfs([(root,0)],tree)
    return tree

    # tree = append_children(root, dict())
    # return tree

# def create_tree(taxid, root):
#     taxon = TaxonNode.objects(taxid=taxid).as_pymongo()

#     root.children.append(taxon)

# def create_tree(node, max_leaves):
#     node_counts={}
#     max_level = bfs(node,node_counts, max_leaves)
#     tree={}
#     dfs([(node,0)],tree,max_level)
#     return tree