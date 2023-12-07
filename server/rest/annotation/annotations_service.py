from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation, Organism, Assembly
from datetime import datetime
from errors import NotFound

ANNOTATIONS_DATA_PATH = "/server/annotations_data"

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

def delete_annotation(name):
    ann_obj = GenomeAnnotation.objects(name=name).first()
    if not ann_obj:
        raise NotFound
    deleted_name = ann_obj.name
    ann_obj.delete()
    organism_to_update = Organism.objects(taxid=ann_obj.taxid)
    organism_to_update.modify(pull__annotations=ann_obj.name)
    return deleted_name


def create_annotation(request):
    data = request.form
    files = request.files
    data_required_fields = ['name', 'assembly_accession']
    url_fields = ['gff_gz_location', 'tab_index_location']
    files_required_fields = ['gzipAnnotation','tabixAnnotation']
    valid_data = dict()

    #check mandatory fields
    for required_field in data_required_fields:
        if not required_field in data.keys():
            return f'{required_field} field is required', 400

    #check if name is not already present    
    annotation_name = data['name']
    if GenomeAnnotation.objects(name = annotation_name).first():
        return f'A genome annotation with name: {annotation_name} already exists', 400
    
    #filter valid keys
    metadata_dict={}
    for key in data.keys():
        if 'metadata.' in key:
            metadata_field, key_field = key.split('.')
            metadata_dict[key_field] = data[key]
        elif data[key]:
            valid_data[key] = data[key]
    #get related assembly
    if metadata_dict.keys():
        valid_data['metadata'] = dict(**metadata_dict)
    assembly = Assembly.objects(accession=valid_data['assembly_accession']).first()
    if not assembly:
        return 'Assembly not found', 400
    
    #store files
    if files:
        for k in files_required_fields:
            if not files[k]:
                return f'{k} field is required',400
            else: 
                annotation_name = valid_data['name']
                extension = 'gz' if k == 'gzipAnnotation' else 'gz.tbi'
                filename = f'{assembly.accession}.{annotation_name}.gff.{extension}'
                files[k].save(f"{ANNOTATIONS_DATA_PATH}/{filename}")
                valid_data['external'] = False
                print(request.host_url)
                host_url = f"{request.host_url}api/download/{filename}"
                key = 'gff_gz_location' if extension == 'gz' else 'tab_index_location'
                valid_data[key] = host_url

    #or check if url fields are present
    else:
        for url_field in url_fields:
            if not url_field in valid_data.keys():
                return f'{url_field} field is required', 400

    organism = Organism.objects(taxid=assembly.taxid).first()
    valid_data['scientific_name'] = organism.scientific_name
    new_genome_annotation = GenomeAnnotation(**valid_data)
    new_genome_annotation.save()
    organism.modify(add_to_set__annotations=new_genome_annotation.name)
    organism.save()
    return f'genome annotation {new_genome_annotation.name} correctly saved',201



"""
TODO: add this method
The expected folder structure is:
    <taxid> 
        <assembly_accession>.<annotation_name>.<'gz' or 'tbi'>

It generates a txt file report containing the inserted status of each annotation

"""
# def check_annotations_directory(path):<
