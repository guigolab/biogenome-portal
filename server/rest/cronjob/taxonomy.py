from db.models import ComputedTree
from ..taxonomy import taxonomy_service
import os
import datetime


ROOT_NODE = os.getenv('ROOT_NODE')

def compute_tree():
    tree = taxonomy_service.create_tree(ROOT_NODE)
    computed_tree = ComputedTree.objects().first()
    if not computed_tree:
        computed_tree = ComputedTree()
    computed_tree.tree = tree
    computed_tree.last_update = datetime.datetime.now()
    computed_tree.save()

