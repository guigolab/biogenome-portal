from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation

def get_annotations(filter=None, offset=0, limit=20):
    query = get_filter(filter) if filter else None
    if query:
        annotations = GenomeAnnotation.objects(query).exclude('id','created')
    else:
        annotations = GenomeAnnotation.objects().exclude('id','created')
    return annotations.count(), annotations[int(offset):int(offset)+int(limit)]

def get_filter(filter):
    return (Q(name__iexact=filter) | Q(name__icontains=filter))


