from mongoengine.queryset.visitor import Q
from db.models import GenomeAnnotation, Assembly
from helpers import data as data_helper, organism as organism_helper
from mongoengine.errors import ValidationError
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from flask import send_from_directory
import os

ANNOTATIONS_DATA_PATH = '/server/annotations_data'
BASE_PATH = os.getenv('BASE_PATH')
DATA_REQUIRED_FIELDS = ['name', 'assembly_accession']
URL_FIELDS = ['gff_gz_location', 'tab_index_location']
FILES_REQUIRED_FIELDS = ['gzipAnnotation', 'tabixAnnotation']


def get_annotations(args):
    filter = get_filter(args.get('filter'))
    return data_helper.get_items(args, 
                                 GenomeAnnotation, 
                                 filter,
                                 ['name', 'scientific_name', 'taxid', 'assembly_accession'])

def get_filter(filter):
    if filter:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter)) | (Q(assembly_name__iexact=filter) | Q(assembly_name__icontains=filter)) |  (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(name__iexact=filter) | Q(name__icontains=filter))

def delete_annotation(name):
    ann_obj = get_annotation(name)
    deleted_name = ann_obj.name
    if not ann_obj.external:
        files_to_remove = [
            f'{ann_obj.assembly_accession}.{name}.gff.gz',
            f'{ann_obj.assembly_accession}.{name}.gff.gz.tbi'
        ]
        for f in files_to_remove:
            path = f'{ANNOTATIONS_DATA_PATH}/{f}'
            if os.path.exists(path):
                os.remove(path)

    ann_obj.delete()
    return deleted_name


def check_required_fields(fields, data):
    missing_fields = [field for field in fields if field not in data]
    if missing_fields:
        raise BadRequest(descriptioncheck_required_fields=f"Missing required files: {', '.join(missing_fields)}")

def check_annotation_exists(annotation_name):
    if GenomeAnnotation.objects(name=annotation_name).first():
        raise Conflict(description=f"{annotation_name} already exists")

def get_assembly(assembly_accession):
    assembly_obj = Assembly.objects(accession=assembly_accession).first()
    if not assembly_obj:
        raise NotFound(description=f"Assembly {assembly_accession} not found")
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

def save_files(files, valid_data, assembly_accession, annotation_name, request):
    if not os.path.exists(ANNOTATIONS_DATA_PATH):
        os.makedirs(ANNOTATIONS_DATA_PATH)

    for k in FILES_REQUIRED_FIELDS:
        if not files.get(k):
            raise BadRequest(description=f"{k} is a required field")
        
        extension = 'gz' if k == 'gzipAnnotation' else 'gz.tbi'
        key = 'gff_gz_location' if extension == 'gz' else 'tab_index_location'
        filename = f'{assembly_accession}.{annotation_name}.gff.{extension}'
        files[k].save(f"{ANNOTATIONS_DATA_PATH}/{filename}")
        
        valid_data['external'] = False
        host_url = f"{request.host_url}{BASE_PATH}/api/download/{filename}" if BASE_PATH else f"{request.host_url}/api/download/{filename}"
        valid_data[key] = host_url

def create_annotation(request):
    data = request.json if request.is_json else request.form
    files = request.files

    # Check required fields
    check_required_fields(DATA_REQUIRED_FIELDS, data)

    annotation_name = data.get('name')

    # Check if annotation already exists
    check_annotation_exists(annotation_name)

    assembly_accession = data.get('assembly_accession')

    # Get assembly object
    assembly_obj = get_assembly(assembly_accession)

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
        save_files(files, valid_data, assembly_accession, annotation_name, request)
    else:
        # Check URL fields if no files are provided
        check_required_fields(FILES_REQUIRED_FIELDS, valid_data)

    # Save annotation
    try:
        new_genome_annotation = GenomeAnnotation(**valid_data).save()
        organism_obj = organism_helper.handle_organism(new_genome_annotation.taxid)
        data_helper.update_lineage(new_genome_annotation, organism_obj)

    except ValidationError as e:
        raise BadRequest(description=f"{e.to_dict()}")

    return new_genome_annotation.name

def get_annotation(name):
    ann_obj = GenomeAnnotation.objects(name=name).exclude('id', 'created').first()
    if not ann_obj:
        raise NotFound(description=f"Annotation {name} not found")
    return ann_obj

def update_annotation(name, data):
    ann_obj = get_annotation(name)
    ann_obj.update(**data)
    return name

def stream_annotation(filename):
    mime_type = 'binary/octet-stream'
    return send_from_directory(ANNOTATIONS_DATA_PATH, filename, conditional=True, mimetype=mime_type)