from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation, Assembly
from errors import NotFound
from ..organism import organisms_service
from ..utils import data_helper
from mongoengine.errors import ValidationError


ANNOTATIONS_DATA_PATH = "/server/annotations_data"
FIELDS_TO_EXCLUDE = ['id']


def get_annotations(args):
    filter = get_filter(args.get('filter'))
    selected_fields = [v for k, v in args.items(multi=True) if k.startswith('fields[]')]
    if not selected_fields:
        selected_fields = ['name', 'scientific_name', 'taxid', 'assembly_accession']
    return data_helper.get_items(args, 
                                 GenomeAnnotation, 
                                 FIELDS_TO_EXCLUDE, 
                                 filter,
                                 selected_fields)


def get_filter(filter):
    if filter:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter)) | (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter)) |  (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(name__iexact=filter) | Q(name__icontains=filter))
    return None

def delete_annotation(name):
    ann_obj = GenomeAnnotation.objects(name=name).first()
    if not ann_obj:
        raise NotFound
    deleted_name = ann_obj.name
    ann_obj.delete()
    return deleted_name

def create_annotation(request):
    data = request.form
    files = request.files
    data_required_fields = ['name', 'assembly_accession']
    url_fields = ['gff_gz_location', 'tab_index_location']
    files_required_fields = ['gzipAnnotation','tabixAnnotation']
    valid_data = dict()

    #check fields
    for required_field in data_required_fields:
        if not required_field in data:
            return f'{required_field} field is required', 400
    
    annotation_name = data.get('name')
    if GenomeAnnotation.objects(name = annotation_name).first():
        return f'A genome annotation with name: {annotation_name} already exists', 400
    
    assembly_accession = data.get('assembly_accession')
    assembly_obj = Assembly.objects(accession=assembly_accession).first()
    if not assembly_obj:
        return f"Assembly {assembly_accession} not found", 400
    
    #filter valid keys
    metadata_dict={}
    for key in data:
        if 'metadata.' in key:
            metadata_field, key_field = key.split('.')
            metadata_dict[key_field] = data[key]
        elif data[key]:
            valid_data[key] = data[key]

    if metadata_dict.keys():
        valid_data['metadata'] = dict(**metadata_dict)

    valid_data['scientific_name'] = assembly_obj.scientific_name
    valid_data['taxid'] = assembly_obj.taxid
    valid_data['assembly_name'] = assembly_obj.assembly_name

    if files:
        for k in files_required_fields:
            if not files[k]:
                return f'{k} field is required', 400
            
            extension = 'gz' if k == 'gzipAnnotation' else 'gz.tbi'
            key = 'gff_gz_location' if extension == 'gz' else 'tab_index_location'

            filename = f'{assembly_accession}.{annotation_name}.gff.{extension}'
            files[k].save(f"{ANNOTATIONS_DATA_PATH}/{filename}")

            valid_data['external'] = False
            host_url = f"{request.host_url}api/download/{filename}"
            valid_data[key] = host_url

    elif not all(url_field in valid_data for url_field in url_fields):
        # Check if all URL fields are present
            missing_fields = [url_field for url_field in url_fields if url_field not in valid_data]
            return f'{", ".join(missing_fields)} field(s) is(are) required', 400

    try:
        new_genome_annotation = GenomeAnnotation(**valid_data).save()

    except ValidationError as e:
        return e.to_dict(), 400

    organism = organisms_service.get_or_create_organism(valid_data.get('taxid'))
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
