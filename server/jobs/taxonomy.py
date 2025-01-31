from db.models import Organism,Assembly,BioSample,LocalSample,Experiment,SampleCoordinates,TaxonNode
import os
import json
from celery import shared_task
from helpers import taxonomy as taxonomy_helper

ROOT_NODE = os.getenv('ROOT_NODE')

@shared_task(name='helpers_handle_orphans', ignore_result=False)
def handle_orphan_organisms():
    orphans = Organism.objects(insdc_status=None)
    for orphan in orphans:
        orphan.save()
        if not orphan.insdc_status:
            orphan.delete()


def compute_tree():
    node = TaxonNode.objects(taxid=ROOT_NODE)
    if not node:
        print(f"{node} not found")
        return
    
    tree = taxonomy_helper.dfs_generator_iterative(node)
    # Resolve the path to the static folder
    current_dir = os.path.dirname(os.path.abspath(__file__))
    static_dir = os.path.join(current_dir, '../static')
    
    # Ensure the static directory exists
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
    
    file_path = os.path.join(static_dir, 'tree.json')
    
    # Open the file in write mode ('w'), which creates or overwrites the file
    with open(file_path, 'w') as file:
        json.dump(tree, file, indent=4)

    print(f"Tree has been written to {file_path}")

@shared_task(name='helpers_add_lineage', ignore_result=False)
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