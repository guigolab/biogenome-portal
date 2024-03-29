from db.models import Organism, TaxonNode
from ..utils import ena_client
from ..organism import organisms_service
from db.enums import INSDCStatus
from collections import deque

def create_tree(taxid):
    # Fetch the initial taxon node
    node = TaxonNode.objects(taxid=taxid).exclude('id').first()
    taxons = TaxonNode.objects().exclude('id')
    tree = dfs(node, taxons)
    return tree

def bfs(root, nodes, max_leaves):
    queue = deque([(root, 0)])

    while queue:
        node, level = queue.popleft()

        if level == 0:
            nodes[level] = 1

        if node.children:
            children = TaxonNode.objects(taxid__in=node.children)

            for child in children:
                queue.append((child, level + 1))
                nodes[level + 1] = nodes.get(level + 1, 0) + 1

        if nodes[level] > max_leaves:
            return level - 1

def dfs(node, taxons):
    tree = {
        "name": node.name,
        "taxid": node.taxid,
        "rank": node.rank,
        "leaves": node.leaves,
        "children": []
    }
    if node.children:
        children = taxons.filter(taxid__in=node.children)
        for child in children:
            child_dict = dfs(child, taxons)
            tree["children"].append(child_dict)
    return tree


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

def create_tree_from_relative_species(taxid, insdc_status=INSDCStatus.ASSEMBLIES):
    organism = Organism.objects(taxid=taxid).first()
    response=dict(tree=dict(), taxon='')
    if not organism:
        taxon_xml = ena_client.get_taxon_from_ena(taxid)
        if not taxon_xml:
            return
        ena_lineage= organisms_service.parse_taxon_from_ena(taxon_xml)
        lineage = [taxon['taxId'] for taxon in ena_lineage if taxon['scientificName'] != 'root']
        response['scientific_name'] = ena_lineage[0]['scientificName']
    else:
        lineage = organism.taxon_lineage
        response['scientific_name'] = organism.scientific_name
    for taxon in lineage:
        query =  {'taxon_lineage':taxon,'insdc_status':insdc_status}
        organisms = Organism.objects(**query)
        if organisms.count() > 0:
            root = TaxonNode.objects(taxid=taxon).first()
            response['taxon'] = root.name
            valid_taxids = list(set().union(*organisms.scalar('taxon_lineage')))
            dfs_generator([(root,0)],response['tree'],list(valid_taxids))
            return response
    
