from db.models import Organism, TaxonNode
from helpers import organism as organism_helper, taxonomy as taxonomy_helper
from werkzeug.exceptions import NotFound
from flask import Response
from extensions.cache import cache
import json
import os

ROOT_NODE = os.getenv('ROOT_NODE')


def get_root_tree():
    """
    Returns flattened taxonomy tree with only leaves as count.
    Uses parent mapping from children + aggregation (same logic as get_flattened_tree),
    but exposes only: taxid, parent_taxid, name, rank, leaves.
    Skips taxons that have ROOT_NODE as children (ancestors above our root).
    """
    if not ROOT_NODE:
        raise NotFound(description="ROOT_NODE not configured")

    taxon_coll = TaxonNode._get_collection()

    # Taxons that have ROOT_NODE as children = ancestors above our root; skip them
    skip_taxids = [
        doc["taxid"]
        for doc in taxon_coll.find(
            {"children": ROOT_NODE},
            {"taxid": 1}
        )
    ]

    # Build parent mapping - stream cursor (no list conversion)
    parent_by_child = {}
    match_skip = {"taxid": {"$nin": skip_taxids}} if skip_taxids else {}
    for doc in taxon_coll.find(match_skip, {"taxid": 1, "children": 1}):
        parent_taxid = doc["taxid"]
        for child_taxid in doc.get("children", []):
            parent_by_child[child_taxid] = parent_taxid

    fields = [
        "taxid",
        "parent_taxid",
        "name",
        "rank",
        "leaves",
    ]

    pipeline = [
        {"$match": match_skip},
        {
            "$project": {
                "taxid": 1,
                "name": 1,
                "rank": 1,
                "leaves": {"$ifNull": ["$leaves", 0]},
                "_id": 0,
            }
        },
    ]

    cache_key = f"cached_flattened_tree_leaves_{ROOT_NODE}"
    cached = cache.get(cache_key)
    if cached is not None:
        return Response(json.dumps(cached), mimetype="application/json")

    rows = []
    for doc in taxon_coll.aggregate(pipeline):
        taxid = doc["taxid"]
        rows.append([
            taxid,
            parent_by_child.get(taxid),
            doc.get("name", ""),
            doc.get("rank", ""),
            doc.get("leaves", 0),
        ])
    result = {"fields": fields, "rows": rows}
    cache.set(cache_key, result, timeout=3600)
    return Response(json.dumps(result), mimetype="application/json")


def create_tree(taxid):
    node = TaxonNode.objects(taxid=taxid).exclude('id').first()
    if not node:
        raise NotFound(description=f"Taxon {taxid} not found")
    tree = taxonomy_helper.dfs_generator_iterative(node)
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

        

def detect_cycle(graph):
    """
    Detects a cycle in a directed graph.
    :param graph: A dictionary where keys are node names and values are lists of child node names.
    :return: A tuple (has_cycle, cycle_nodes). has_cycle is True if a cycle is detected, False otherwise.
             cycle_nodes is a list of nodes involved in the cycle if one is detected, empty otherwise.
    """
    def dfs(node, visited, rec_stack):
        visited.add(node)
        rec_stack.add(node)
        
        for child in graph.get(node, []):
            if child not in visited:
                if dfs(child, visited, rec_stack):
                    return True
            elif child in rec_stack:
                cycle_nodes.append(child)
                return True
        
        rec_stack.remove(node)
        return False
    
    visited = set()
    rec_stack = set()
    cycle_nodes = []
    
    for node in graph:
        if node not in visited:
            if dfs(node, visited, rec_stack):
                cycle_nodes.append(node)
                return True, cycle_nodes
    
    return False, []



