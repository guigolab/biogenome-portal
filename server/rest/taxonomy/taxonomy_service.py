from db.models import Organism, TaxonNode,ComputedTree
from ..cronjob import cronjob_service
from datetime import datetime
from extensions.cache import cache
from helpers import organism as organism_helper, taxonomy as taxonomy_helper
from errors import NotFound

@cache.cached(timeout=300)
def get_computed_tree():
    computed_tree = ComputedTree.objects().exclude('id').first()
    cronjob_service.compute_tree()
    # if not computed_tree or is_older_than_one_day(computed_tree.last_update):
    #     cronjob_service.compute_tree()
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
    node = TaxonNode.objects(taxid=taxid).exclude('id').first()
    if not node:
        raise NotFound
    tree = taxonomy_helper.dfs_generator(node, node.children)
    return tree

def generate_tree(data):
    taxids = data['taxids']
    organisms = Organism.objects(taxid__in=taxids)
    root = TaxonNode.objects(taxid= data['root']).first()
    #get root node
    lineages = [org.taxon_lineage for org in organisms]
    result = set().union(*lineages)
    tree = taxonomy_helper.dfs_generator_from_taxid_list(root, result)
    return tree

def get_closest_taxon(taxid):
    
    taxon = TaxonNode.objects(taxid=taxid).exclude('id').first()
    
    if taxon:
        return taxon, 200
    
    organism, parsed_taxons = organism_helper.retrieve_taxonomic_info(taxid)
    if not organism:
        return f"Taxon with taxid {taxid} not found in INSDC", 400
    
    existing_taxons = TaxonNode.objects(taxid__in=[node.taxid for node in parsed_taxons]).exclude('id')
    
    for node in parsed_taxons:
        taxid = node.get('taxId')
        for ex_taxon in existing_taxons:
            if taxid == ex_taxon.taxid:
                return ex_taxon, 200

        

