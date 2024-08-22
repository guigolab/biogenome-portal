from db.models import ComputedTree,TaxonNode,Organism
import os
import datetime
from helpers.taxonomy import dfs_generator_recursive
from celery import shared_task

ROOT_NODE = os.getenv('ROOT_NODE')

@shared_task(name='compute_tree', ignore_result=False)
def compute_tree():
    node = TaxonNode.objects(taxid=ROOT_NODE).first()
    if not node:
        raise f"Taxon node not found for {ROOT_NODE}"
    
    tree = dfs_generator_recursive(node)
    computed_tree = ComputedTree.objects().first()
    if not computed_tree:
        computed_tree = ComputedTree()
    computed_tree.tree = tree
    computed_tree.last_update = datetime.datetime.now()
    computed_tree.save()

@shared_task(name='handle_orphan_organisms', ignore_result=False)
def handle_orphan_organisms():
    orphans = Organism.objects(insdc_status=None)
    for orphan in orphans:
        orphan.save()
        if not orphan.insdc_status:
            orphan.delete()



