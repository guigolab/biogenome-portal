from importlib_metadata import metadata
from utils.utils import get_annotations
from db.models import Annotation,Assembly

GENOME_BROWSER_URL='https://genome.crg.cat/geneid-predictions/#/organisms/'

def parse_annotation(organism_obj, ass_obj):
    response = get_annotations(organism_obj.scientific_name)
    if not response or not 'annotations' in response.keys():
        return
    for ann in response['annotations']:
        if ass_obj.assembly_name == ann['targetGenome'] and not Annotation.objects(name=ann['name']).first():
            page_url=GENOME_BROWSER_URL+organism_obj.scientific_name
            metadata = dict()
            for k in ann.keys():
                if k != 'name':
                    metadata[k] = ann[k]
            annotation = Annotation(page_url=page_url,name=ann['name'], assembly_accession=ass_obj.accession,metadata=metadata, taxid=organism_obj.taxid).save()
            organism_obj.modify(add_to_set__annotations=annotation.name) 
            