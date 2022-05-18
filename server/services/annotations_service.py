from utils.utils import get_annotations
from db.models import Annotation,Assembly

GENOME_BROWSER_URL='https://genome.crg.cat/geneid-predictions/#/organisms/'

def parse_annotation(organism_obj, ass_obj):
    response = get_annotations(organism_obj.organism)
    if not response or not 'annotations' in response.keys():
        return
    for ann in response['annotations']:
        if ass_obj.assembly_name == ann['targetGenome'] and not Annotation.objects(name=ann['name']).first():
            page_url=GENOME_BROWSER_URL+organism_obj.organism
            annotation = Annotation(pageURL=page_url, assemblyAccession=ass_obj.accession,**ann).save()
            return annotation
            