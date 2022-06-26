from utils.utils import get_annotations
from db.models import Annotation, AssemblyTrack


def parse_annotation(organism_obj, ass_obj):
    response = get_annotations(organism_obj.scientific_name)
    if not response or not 'annotations' in response.keys():
        return
    for ann in response['annotations']:
        if ass_obj.assembly_name == ann['targetGenome'] and not Annotation.objects(name=ann['name']).first():
            annotation = Annotation(taxid=organism_obj.taxid,**ann).save()
            ##save assembly track
            for ass in response['genomes']:
                if ass['name'] == ass_obj.assembly_name:
                    ass_track = AssemblyTrack(**ass)
                    ass_obj.modify(track=ass_track)
            organism_obj.modify(add_to_set__annotations=annotation.name) 
            