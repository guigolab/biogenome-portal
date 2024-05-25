from db.models import ComputedTree,TaxonNode
import os
import datetime
from helpers.taxonomy import dfs_generator
from celery import shared_task

ROOT_NODE = os.getenv('ROOT_NODE')

@shared_task(name='compute_tree', ignore_result=False)
def compute_tree():
    node = TaxonNode.objects(taxid=ROOT_NODE).first()
    if not node:
        raise f"Taxon node not found for {ROOT_NODE}"
    
    tree = dfs_generator(node)
    computed_tree = ComputedTree.objects().first()
    if not computed_tree:
        computed_tree = ComputedTree()
    computed_tree.tree = tree
    computed_tree.last_update = datetime.datetime.now()
    computed_tree.save()

