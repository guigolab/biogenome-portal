from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation, Organism, Assembly
from datetime import datetime

def get_annotations(offset=0,limit=20,
                        filter=None, filter_option="name",
                        sort_column=None,sort_order=None,
                        start_date=None, end_date=datetime.utcnow):
    if filter:
        filter_query= get_filter(filter,filter_option)
    else:
        filter_query = None
    if start_date:
        date_query = (Q(created__gte=start_date) & Q(created__lte=end_date))
    else:
        date_query = None
    if filter_query and date_query:
        annotations = GenomeAnnotation.objects(filter_query,date_query).exclude('id')
    elif filter_query:
        annotations = GenomeAnnotation.objects(filter_query).exclude('id')
    elif date_query:
        annotations = GenomeAnnotation.objects(date_query).exclude('id')
    else:
        annotations = GenomeAnnotation.objects().exclude('id')
    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        annotations = annotations.order_by(sort)
    return annotations.count(), annotations[int(offset):int(offset)+int(limit)]



def get_filter(filter, option):
    if option == 'scientific_name':
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    elif option == 'assembly_name':
        return (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter))
    else:
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

