from db.models import TaxonNode,Organism
import os

ROOT_NODE = os.getenv('ROOT_NODE', 1)

def create_or_update_root_taxon():

    # Fetch the first element of the taxon lineage for each organism
    parent_taxids = Organism.objects(slice_taxon_lineage=[0, 1]).scalar('taxon_lineage')

    # Ensure unique parent taxids using set
    unique_taxids = set(parent_taxids)

    # Fetch taxon nodes matching the unique taxids
    taxons = TaxonNode.objects(taxid__in=list(unique_taxids)).scalar('taxid', 'leaves')

    # Build the children and calculate the total leaves
    children = [t[0]for t in taxons]
    total_leaves = sum(t[1] for t in taxons if t[1] is not None)

    # Check if root node already exists
    root = TaxonNode.objects(taxid=ROOT_NODE).first()

    if root:
        # Update the existing root node
        root.update(
            set__children=children,
            set__leaves=total_leaves
        )
    else:
        # Create a new root node
        root = TaxonNode(
            name='root',
            taxid=ROOT_NODE,
            children=children,
            leaves=total_leaves
        )
        root.save()

    root.reload()

    return root


def save_taxons_and_update_hierachy(parsed_taxons, organism_obj):
    save_parsed_taxons(parsed_taxons)
    ordered_nodes = get_and_order_saved_taxon_nodes(organism_obj)
    update_taxon_hierarchy(ordered_nodes)
    

def save_parsed_taxons(parsed_taxons):
    existing_taxids = TaxonNode.objects(taxid__in=[t.taxid for t in parsed_taxons]).scalar('taxid')
    taxons_to_save = [taxon for taxon in parsed_taxons if taxon.taxid not in existing_taxids]
    if taxons_to_save:
        TaxonNode.objects.insert(taxons_to_save)

def check_species_permission(user, existing_taxids):
    if user.role.value == 'Admin':
        return []

    return [check_user_permission_for_taxid(user, taxid) for taxid in existing_taxids if taxid not in user.species]


def check_user_permission_for_taxid(user, taxid):
    if taxid not in user.species:
        return f"The organism {taxid} already exists in the db and you don't have the rights to modify it!"
    return None

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


def dfs_generator_iterative(node):
    tree = {
        "name": node.name,
        "taxid": node.taxid,
        "rank": node.rank,
        "leaves": node.leaves,
        "children": []
    }

    stack = [(node, tree)]

    while stack:
        current_node, current_tree = stack.pop()
        if current_node.children:
            children = TaxonNode.objects(taxid__in=current_node.children)
            for child in children:
                child_tree = {
                    "name": child.name,
                    "taxid": child.taxid,
                    "rank": child.rank,
                    "leaves": child.leaves,
                    "children": []
                }
                current_tree["children"].append(child_tree)
                stack.append((child, child_tree))

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