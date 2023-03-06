from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation, Organism, Assembly

def get_annotations(filter=None, offset=0, limit=20):
    query = get_filter(filter) if filter else None
    if query:
        annotations = GenomeAnnotation.objects(query).exclude('id','created')
    else:
        annotations = GenomeAnnotation.objects().exclude('id','created')
    return annotations.count(), annotations[int(offset):int(offset)+int(limit)]

def get_filter(filter):
    return (Q(name__iexact=filter) | Q(name__icontains=filter))


def create_annotation(data):
    valid_data = dict()
    for key in data.keys():
        if data[key]:
            valid_data[key] = data[key]
    if not 'taxid' in valid_data.keys():
        return 'taxid field is required', 400
    organism = Organism.objects(taxid=valid_data['taxid']).first()
    if not organism:
        return 'organism not found', 400
    valid_data['scientific_name'] = organism.scientfic_name
    if not 'assembly_accession' in data.keys():
        return 'assembly_accession is required', 400
    assembly = Assembly.objects(accession=data['assembly_accession']).first()
    if not assembly:
        return 'Assembly not found', 400
    valid_data['assembly_name'] = assembly.assembly_name
    new_genome_annotation = GenomeAnnotation(**valid_data).save()
    return f'genome annotation {new_genome_annotation.name} correctly saved',201

