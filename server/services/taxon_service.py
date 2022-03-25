from db.models import Organism, TaxonNode
from flask import current_app as app
from utils import constants
import os



RANKS = os.getenv('RANKS').split(',')

#expects lazy references
def delete_taxons(lineage):
    taxons = [tax.fetch() for tax in lineage]
    leaves_counter(taxons)
    for taxon in taxons:
        if taxon.leaves < 2:
            app.logger.info(TaxonNode.objects(children=taxon.id).update_one(pull__children=taxon.id))
            taxon.delete()

def create_taxons_from_lineage(lineage):
    taxon_lineage = []
    for node in lineage:
        if ('rank' in node.keys() and node['rank'] in constants.RANKS) or node['taxId'] == 1:
            taxon_node = TaxonNode.objects(taxid=node['taxId']).first()
            if not taxon_node:
                taxon_node = TaxonNode(taxid=node['taxId'], name=node['scientificName'], rank=node['rank']).save()
            taxon_lineage.append(taxon_node)
    #create relationship
    create_relationship(taxon_lineage)
    return taxon_lineage

#put species and subspecies at the same level for navigation purpose
def create_relationship(lineage):
    for index in range(len(lineage)-1):
        child_taxon = lineage[index]
        father_taxon = lineage[index + 1] if child_taxon.rank != 'subspecies' else lineage[index+2]
        if not any(child_node.id == child_taxon.id for child_node in father_taxon.children):
            father_taxon.children.append(child_taxon)
            father_taxon.save()
        else:
            continue

def leaves_counter(lineage_list):
    for node in lineage_list:
        node.leaves=Organism.objects(taxon_lineage=node.id, taxid__ne=node.taxid).count()
        node.save()


