from db.models import Organism,Assembly,BioSample,LocalSample,Experiment,SampleCoordinates
import os
from celery import shared_task

ROOT_NODE = os.getenv('ROOT_NODE')

@shared_task(name='helpers_handle_orphans', ignore_result=False)
def handle_orphan_organisms():
    orphans = Organism.objects(insdc_status=None)
    for orphan in orphans:
        orphan.save()
        if not orphan.insdc_status:
            orphan.delete()


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