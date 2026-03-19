from db.models import GenomeAnnotation, Assembly
from helpers import organism as organism_helper
from helpers.taxon_organism_sync import sync_organism_status_and_taxon_counts
from mongoengine.errors import ValidationError
from werkzeug.exceptions import BadRequest, Conflict
from flask import send_from_directory
import os
from rest.common.service_utils import get_or_404

ANNOTATIONS_DATA_PATH = '/server/annotations_data'
BASE_PATH = os.getenv('BASE_PATH')
DATA_REQUIRED_FIELDS = ['name', 'assembly_accession']
URL_FIELDS = ['gff_gz_location', 'tab_index_location']
FILES_REQUIRED_FIELDS = ['gzipAnnotation', 'tabixAnnotation']

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
        raise BadRequest(description=f"Missing required fields: {', '.join(missing_fields)}")

def check_annotation_exists(annotation_name):
    if GenomeAnnotation.objects(name=annotation_name).first():
        raise Conflict(description=f"{annotation_name} already exists")

def get_assembly(assembly_accession):
    return get_or_404(Assembly, f"Assembly {assembly_accession} not found", accession=assembly_accession)

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
        
        if BASE_PATH:
            host_url = f"{request.host_url}{BASE_PATH[1:]}/api/download/{filename}"
        else:
            host_url = f"{request.host_url}/api/download/{filename}"
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
    organism_obj = organism_helper.handle_organism(taxid)
    if not organism_obj:
        raise BadRequest(description=f"Organism {taxid} not found")
    lineage = assembly_obj.taxon_lineage or organism_obj.taxon_lineage or []
    # Extract metadata
    valid_data = extract_metadata(data)
    valid_data.update({
        'scientific_name': assembly_obj.scientific_name,
        'taxid': taxid,
        'assembly_name': assembly_obj.assembly_name,
        'taxon_lineage': list(lineage),
    })

    # Handle file saving
    if files:
        save_files(files, valid_data, assembly_accession, annotation_name, request)
    else:
        # Check URL fields if no files are provided
        check_required_fields(FILES_REQUIRED_FIELDS, valid_data)

    # Save annotation (lineage preset so one post_save sync covers status + taxon counts)
    try:
        new_genome_annotation = GenomeAnnotation(**valid_data).save()

    except ValidationError as e:
        raise BadRequest(description=f"{e.to_dict()}")

    return new_genome_annotation.name

def get_annotation(name):
    return get_or_404(GenomeAnnotation, f"Annotation {name} not found", name=name)

def update_annotation(name, data):
    ann_obj = get_annotation(name)
    valid_data = extract_metadata(data)
    ann_obj.update(**valid_data)
    ann_obj.reload()
    sync_organism_status_and_taxon_counts(
        ann_obj.taxid,
        list(ann_obj.taxon_lineage) if ann_obj.taxon_lineage else None,
    )
    return name

def stream_annotation(filename):
    mime_type = 'binary/octet-stream'
    return send_from_directory(ANNOTATIONS_DATA_PATH, filename, conditional=True, mimetype=mime_type)

def create_nested_dict(dotted_key, value):
    keys = dotted_key.split('.')
    nested_dict = current = {}

    for key in keys[:-1]:
        current[key] = {}
        current = current[key]
    
    current[keys[-1]] = value
    return nested_dict