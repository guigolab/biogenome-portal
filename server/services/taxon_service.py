from db.models import TaxonNode
from flask import current_app as app
from utils import ena_client, utils, constants


# def 

# def create_taxons(taxid):
#     taxon = ena_client.get_taxon_from_ena(taxid)
#     lineage = utils.parse_taxon(taxon)
#     app.logger.info(lineage)
#     taxon_lineage = create_taxons_from_lineage(lineage)
#     leaves_counter(taxon_lineage)
#     return taxon_lineage

def delete_taxons_c(taxid_list):
    length = len(TaxonNode.objects(taxid__in=taxid_list))
    TaxonNode.objects(taxid__in=taxid_list).delete()
    return length

def create_taxons_from_lineage(lineage):
    taxon_lineage = []
    for node in lineage:
        if ('rank' in node.keys() and node['rank'] in constants.RANKS) or node['taxId'] == 1:
            taxon_node = TaxonNode.objects(taxid=node['taxId']).upsert_one(set__taxid=node['taxId'], set__name=node['scientificName'], set__rank=node['rank'])
            taxon_lineage.append(taxon_node)
    #create relationship
    create_relationship(taxon_lineage)
    leaves_counter(taxon_lineage)
    return taxon_lineage

def create_relationship(lineage):
    for index in range(len(list(reversed(lineage)))-1):
        child_taxon = lineage[index]
        father_taxon = lineage[index + 1]
        if not any(child_node.id == child_taxon.id for child_node in father_taxon.children):
            father_taxon.children.append(child_taxon)
            father_taxon.save()
        else:
            continue

def leaves_counter(lineage_list):
    for node in lineage_list:
        node.leaves=count_species(node)
        node.save()

def count_species(tax_node):
    leaves = 0
    if not tax_node:
        return 0
    elif len(tax_node.children) == 0:
        return 1
    else:
        children = TaxonNode.objects(id__in=[lz_ref.id for lz_ref in tax_node.children])
        for child in children:
            leaves += count_species(child)
        return leaves

