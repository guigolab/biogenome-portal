from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation, Assembly
from errors import NotFound
from helpers import data as data_helper, organism as organism_helper
from mongoengine.errors import ValidationError


ANNOTATIONS_DATA_PATH = "/server/annotations_data"
FIELDS_TO_EXCLUDE = ['id']
DATA_REQUIRED_FIELDS = ['name', 'assembly_accession']
URL_FIELDS = ['gff_gz_location', 'tab_index_location']
FILES_REQUIRED_FIELDS = ['gzipAnnotation', 'tabixAnnotation']


def get_annotations(args):
    filter = get_filter(args.get('filter'))
    return data_helper.get_items(args, 
                                 GenomeAnnotation, 
                                 FIELDS_TO_EXCLUDE, 
                                 filter,
                                 ['name', 'scientific_name', 'taxid', 'assembly_accession'])


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


def check_required_fields(data):
    for field in DATA_REQUIRED_FIELDS:
        if field not in data:
            return f'{field} field is required', 400
    return None

def check_annotation_exists(annotation_name):
    if GenomeAnnotation.objects(name=annotation_name).first():
        return f'A genome annotation with name: {annotation_name} already exists', 400
    return None

def get_assembly(assembly_accession):
    assembly_obj = Assembly.objects(accession=assembly_accession).first()
    if not assembly_obj:
        return f"Assembly {assembly_accession} not found", 400
    return assembly_obj

def extract_metadata(data):
    metadata_dict = {}
    valid_data = {}
    for key, value in data.items():
        if 'metadata.' in key:
            metadata_field, key_field = key.split('.')
            metadata_dict[key_field] = value
        else:
            valid_data[key] = value
    if metadata_dict:
        valid_data['metadata'] = metadata_dict
    return valid_data

def save_files(files, valid_data, assembly_accession, annotation_name, taxid, request):
    for k in FILES_REQUIRED_FIELDS:
        if not files.get(k):
            return f'{k} field is required', 400
        
        extension = 'gz' if k == 'gzipAnnotation' else 'gz.tbi'
        key = 'gff_gz_location' if extension == 'gz' else 'tab_index_location'
        filename = f'{assembly_accession}.{annotation_name}.gff.{extension}'
        files[k].save(f"{ANNOTATIONS_DATA_PATH}/{filename}")
        
        valid_data['external'] = False
        host_url = f"{request.host_url}api/download/{filename}"
        valid_data[key] = host_url
    return None


def check_url_fields(valid_data):
    missing_fields = [field for field in URL_FIELDS if field not in valid_data]
    if missing_fields:
        return f'{", ".join(missing_fields)} field(s) is(are) required', 400
    return None


def create_annotation(request):
    data = request.json if request.is_json else request.form
    files = request.files

    # Check required fields
    response = check_required_fields(data)
    if response:
        return response

    annotation_name = data.get('name')

    # Check if annotation already exists
    response = check_annotation_exists(annotation_name)
    if response:
        return response

    assembly_accession = data.get('assembly_accession')

    # Get assembly object
    assembly_obj = get_assembly(assembly_accession)
    if isinstance(assembly_obj, tuple):  # If the function returned an error
        return assembly_obj
    taxid = assembly_obj.taxid
    # Extract metadata
    valid_data = extract_metadata(data)
    valid_data.update({
        'scientific_name': assembly_obj.scientific_name,
        'taxid': taxid,
        'assembly_name': assembly_obj.assembly_name
    })

    # Handle file saving
    if files:
        response = save_files(files, valid_data, assembly_accession, annotation_name, taxid, request)
        if response:
            return response
    else:
        # Check URL fields if no files are provided
        response = check_url_fields(valid_data)
        if response:
            return response

    # Save annotation
    try:
        new_genome_annotation = GenomeAnnotation(**valid_data).save()
        organism_obj = organism_helper.handle_organism(new_genome_annotation.taxid)
        data_helper.update_lineage(new_genome_annotation, organism_obj)

    except ValidationError as e:
        return e.to_dict(), 400

    return f'genome annotation {new_genome_annotation.name} correctly saved', 201

def get_annotation(name):
    ann_obj = GenomeAnnotation.objects(name=name).exclude(*[FIELDS_TO_EXCLUDE, 'created']).first()
    if not ann_obj:
        raise NotFound
    return ann_obj

def update_annotation(name, data):
    ann_obj = GenomeAnnotation.objects(name=name).first()
    if not ann_obj:
        raise NotFound
    ann_obj.save(**data)
    return f'genome annotation {name} correctly updated', 201
