from db.models import ComputedTree,TaxonNode,Organism,Assembly,BioSample,LocalSample,Experiment,SampleCoordinates
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




@shared_task(name='add_lineage', ignore_result=False)
def add_lineage():
    organism = None
    coordinates = SampleCoordinates.objects()
    for coord in coordinates:
        taxid = coord.taxid
        if not organism or organism.taxid != taxid:
            organism = Organism.objects(taxid=taxid).first()
            if not organism: 
                continue
        coord.update(lineage=organism.taxon_lineage)
    for model in [Assembly,Experiment,BioSample,LocalSample]:
        objects = model.objects()
        for obj in objects:
            taxid = obj.taxid
            if not organism or organism.taxid != taxid:
                organism = Organism.objects(taxid=taxid).first()
                if not organism: 
                    continue
            obj.update(taxon_lineage=organism.taxon_lineage)