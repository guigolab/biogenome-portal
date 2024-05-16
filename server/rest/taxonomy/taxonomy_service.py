from db.models import Organism, TaxonNode,ComputedTree
from ..utils import ena_client
from ..organism import organisms_service
from db.enums import INSDCStatus
from collections import deque
from ..cronjob import cronjob_service
from datetime import datetime
from ..utils.extensions import cache

@cache.cached(timeout=300)
def get_computed_tree():
    computed_tree = ComputedTree.objects().exclude('id').first()
    if not computed_tree or is_older_than_one_day(computed_tree.last_update):
        cronjob_service.compute_tree()
        computed_tree = ComputedTree.objects().exclude('id').first()
    return computed_tree

def is_older_than_one_day(date):
    # Get current date and time
    current_date = datetime.now()
    
    # Calculate the difference between the current date and the given date
    difference = current_date - date
    
    # Check if the difference is greater than 1 day
    if difference.days > 1:
        return True
    else:
        return False

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


## get the closest taxon to the one queried and return its taxonomic identifier

def get_closest_taxon(taxid):
    taxon = TaxonNode.objects(taxid=taxid).exclude('id').first()
    if taxon:
        return taxon, 200
    
    response_tuple = organisms_service.retrieve_taxonomic_info(taxid)
    if not response_tuple:
        return f"Taxon with taxid {taxid} not found in INSDC", 400
    scientific_name, common_name, lineage = response_tuple
    existing_taxons = TaxonNode.objects(taxid__in=[node.get('taxId') for node in lineage]).exclude('id')
    for node in lineage:
        taxid = node.get('taxId')
        for ex_taxon in existing_taxons:
            if taxid == ex_taxon.taxid:
                return ex_taxon, 200


    #intersect lineage with the taxons present in the DB
        

def create_tree_from_relative_species(taxid, insdc_status=INSDCStatus.ASSEMBLIES):
    organism = Organism.objects(taxid=taxid).first()
    response=dict(tree=dict(), taxon='')
    if not organism:
        taxon_xml = ena_client.get_taxon_from_ena_browser(taxid)
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
    
