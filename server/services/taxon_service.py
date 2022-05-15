from db.models import Organism, TaxonNode
from flask import current_app as app

#expects lazy references
def delete_taxons(lineage):
    taxons = [tax.fetch() for tax in lineage]
    leaves_counter(taxons)
    for taxon in taxons:
        if taxon.leaves == 0:
            TaxonNode.objects(children=taxon.id).update_one(pull__children=taxon.id)
            Organism.objects(taxon_lineage=taxon.id).update(pull__taxon_lineage=taxon.id)
            taxon.delete()

def create_taxons_from_lineage(lineage):
    taxon_lineage = []
    for node in lineage:
        if node['scientificName'] == 'root' or node['scientificName'] == 'cellular organisms':
            continue
        taxon_node = TaxonNode.objects(taxid=node['taxId']).first()
        if not taxon_node:
            rank = node['rank'] if 'rank' in node.keys() else 'other'
            taxon_node = TaxonNode(taxid=node['taxId'], name=node['scientificName'], rank=rank).save()
        taxon_lineage.append(taxon_node)
    #create relationship
    create_relationship(taxon_lineage)
    return taxon_lineage

#put species and subspecies at the same level for navigation purpose
def create_relationship(lineage):
    for index in range(len(lineage)-1):
        child_taxon = lineage[index]
        father_taxon = lineage[index + 1]
        if not any(child_node.id == child_taxon.id for child_node in father_taxon.children):
            father_taxon.children.append(child_taxon)
            father_taxon.save()
        else:
            continue

def leaves_counter(lineage_list):
    for node in lineage_list:
        # node.leaves=count_species(node)
        node.leaves=Organism.objects(taxon_lineage=node.id, taxid__ne=node.taxid).count()
        node.save()

# def count_species(tax_node):
#     leaves = 0
#     if not tax_node:
#         return 0
#     elif len(tax_node.children) == 0:
#         return 1
#     else:
#         children = TaxonNode.objects(id__in=[lz_ref.id for lz_ref in tax_node.children])
#         for child in children:
#             leaves += count_species(child)
#         return leaves

