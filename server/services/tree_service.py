from db.models import TaxonNode

def bfs(root,nodes, max_leaves):
    queue = [(root,0)]
    while queue:
        node, level = queue.pop(0)
        if level == 0:
            nodes[level] = 1
        if node.children:
            for child in node.children:
                queue.append((child, level+1))
                nodes[level+1] = nodes.setdefault(level+1, 0) + 1
        if nodes[level] > max_leaves:
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
        children = TaxonNode.objects(id__in=[lz_ref.id for lz_ref in node.children])
        for child in children:
            child_dict = {}
            dfs([(child, level+1)], child_dict, max_level)
            tree["children"].append(child_dict)
    return tree

def get_max_level(counts, limit):
    for level, nodes in counts.items():
        if nodes > limit:
            return level-1

def create_tree(node, max_leaves):
    node_counts={}
    max_level = bfs(node,node_counts, max_leaves)
    tree={}
    dfs([(node,0)],tree,max_level)
    return tree