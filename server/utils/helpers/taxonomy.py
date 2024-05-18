from clients import ncbi_client
from db.models import TaxonNode,Organism
from parsers import taxonomy

def create_taxons_from_organisms(organisms):
    taxon_taxid_list = collect_all_parents(organisms)
    reports = ncbi_client.get_taxons_from_ncbi_datasets(taxon_taxid_list)
    if reports:
        parsed_taxons = taxonomy.parse_taxons_from_ncbi_datasets(reports)
        for org in organisms:
            save_taxons_and_update_hierachy(parsed_taxons, org)


def save_taxons_and_update_hierachy(parsed_taxons, organism_obj):
    save_parsed_taxons(parsed_taxons)
    ordered_nodes = get_and_order_saved_taxon_nodes(organism_obj)
    update_taxon_hierarchy(ordered_nodes)
    

def collect_all_parents(organisms):
    # Initialize an empty set to store all unique parent values
    all_parents = set()

    # Iterate through each taxonomy object in the list
    for item in organisms:
        # Extract the parents array from the taxonomy object
        parents = item.taxon_lineage
        # Add the parents array to the set of all parents
        all_parents.update(parents)
    
    # Convert the set back to a list
    return list(all_parents)

def save_parsed_taxons(parsed_taxons):
    existing_taxids = TaxonNode.objects(taxid__in=[t.taxid for t in parsed_taxons]).scalar('taxid')
    taxons_to_save = [taxon for taxon in parsed_taxons if taxon.taxid not in existing_taxids]
    if taxons_to_save:
        TaxonNode.objects.insert(taxons_to_save)


def validate_taxonomy(user, taxids):
    if not user:
        return [{'user': 'User not found'}], None

    existing_taxids = Organism.objects(taxid__in=[taxids for taxid in taxids])
    taxonomy_errors = check_species_permission(user, existing_taxids)
    if taxonomy_errors:
        return taxonomy_errors, None

    new_taxids = filter_new_taxids(existing_taxids, taxids)
    new_taxons_to_parse, fetch_errors = fetch_new_taxons(new_taxids)
    taxonomy_errors.extend(fetch_errors)

    return taxonomy_errors, new_taxons_to_parse


def check_species_permission(user, existing_taxids):
    if user.role.value == 'Admin':
        return []

    return [check_user_permission_for_taxid(user, taxid) for taxid in existing_taxids if taxid not in user.species]


def check_user_permission_for_taxid(user, taxid):
    if taxid not in user.species:
        return {'taxonomy': f"The organism {taxid} already exists in the db and you don't have the rights to modify it!"}
    return None


def filter_new_taxids(existing_taxids, taxids):
    return [taxid for taxid in taxids if taxid not in existing_taxids]


def fetch_new_taxons(new_taxids):
    if not new_taxids:
        return [], []

    new_taxons_to_parse = ncbi_client.get_taxons_from_ncbi_datasets(new_taxids)
    if not new_taxons_to_parse:
        return [], [{'taxonomy': f"No taxid has been found for {','.join(new_taxids)}"}]

    fetch_errors = validate_fetched_taxons(new_taxids, new_taxons_to_parse)
    return new_taxons_to_parse, fetch_errors


def validate_fetched_taxons(new_taxids, new_taxons_to_parse):
    fetch_errors = []
    insdc_new_taxids = [str(taxon.get('taxonomy').get('tax_id')) for taxon in new_taxons_to_parse]

    for taxid in new_taxids:
        if taxid not in insdc_new_taxids:
            fetch_errors.append({taxid: f"{taxid} not found in INSDC"})

    return fetch_errors

def get_and_order_saved_taxon_nodes(organism_obj):
    taxon_lineage = organism_obj.taxon_lineage
    # Retrieve the taxon nodes from the database
    taxon_nodes = TaxonNode.objects(taxid__in=taxon_lineage)
    
    # Create a dictionary for quick lookup
    taxon_node_dict = {node.taxid: node for node in taxon_nodes}
    
    # Order the taxon nodes based on the taxon_lineage
    ordered_taxon_list = [taxon_node_dict[taxid] for taxid in taxon_lineage if taxid in taxon_node_dict]

    return ordered_taxon_list

def update_taxon_hierarchy(ordered_nodes):
    for index in range(len(ordered_nodes) - 1):
        child_taxon = ordered_nodes[index]
        father_taxon = ordered_nodes[index + 1]
        leaves = count_leaves(father_taxon)
        father_taxon.modify(add_to_set__children=child_taxon.taxid, leaves=leaves)


def count_leaves(father_taxon):
    return Organism.objects(taxon_lineage=father_taxon.taxid, taxid__ne=father_taxon.taxid).count()


def dfs_generator(node):
    tree = {
        "name": node.name,
        "taxid": node.taxid,
        "rank": node.rank,
        "leaves": node.leaves,
        "children": []
    }

    if node.children:
        children = TaxonNode.objects(taxid__in=node.children)
        for child in children:
            tree["children"].append(dfs_generator(child))
    
    return tree

def dfs_generator_from_taxid_list(node, taxid_list):
    tree = {
        "name": node.name,
        "taxid": node.taxid,
        "rank": node.rank,
        "leaves": node.leaves,
        "children": []
    }

    if node.children:
        children = TaxonNode.objects(taxid__in=node.children)
        for child in children:
            if child.taxid not in taxid_list:
                continue
            tree["children"].append(dfs_generator_from_taxid_list(child, taxid_list))
    
    return tree