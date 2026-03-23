from db.model import Assembly, GenomeAnnotation
from helpers import organism as organism_helper
from mongoengine.errors import ValidationError
from werkzeug.exceptions import BadRequest, Conflict
from flask import send_from_directory
import os
from helpers.rest_catalog_sync import sync_species_after_catalog_change
from helpers.service_utils import get_or_404, require_keys

ANNOTATIONS_DATA_PATH = '/server/annotations_data'
BASE_PATH = os.getenv('BASE_PATH')
DATA_REQUIRED_FIELDS = ['name', 'assembly_accession']
FILES_REQUIRED_FIELDS = ['gzipAnnotation', 'tabixAnnotation']

def delete_annotation(name):
    ann_obj = get_or_404(GenomeAnnotation, f"Annotation {name} not found", name=name)
    deleted_name = ann_obj.name
    taxid = ann_obj.taxid
    taxon_lineage = ann_obj.taxon_lineage
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
    sync_species_after_catalog_change(taxid, taxon_lineage)
    return deleted_name


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

    require_keys(data, DATA_REQUIRED_FIELDS, what="annotation")
    annotation_name = data.get('name')
    
    # Check if annotation already exists
    if GenomeAnnotation.objects(name=annotation_name).first():
        raise Conflict(description=f"{annotation_name} already exists")

    assembly_accession = data.get('assembly_accession')

    assembly_obj = get_or_404(Assembly, f"Assembly {assembly_accession} not found", accession=assembly_accession)

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
        require_keys(valid_data, FILES_REQUIRED_FIELDS, what="annotation")

    try:
        new_genome_annotation = GenomeAnnotation(**valid_data).save()

    except ValidationError as e:
        raise BadRequest(description=f"{e.to_dict()}")

    sync_species_after_catalog_change(new_genome_annotation.taxid, new_genome_annotation.taxon_lineage)
    return new_genome_annotation.name

def update_annotation(name, data):
    ann_obj = get_or_404(GenomeAnnotation, f"Annotation {name} not found", name=name)
    valid_data = extract_metadata(data)
    for key, value in valid_data.items():
        setattr(ann_obj, key, value)
    ann_obj.save()
    return name

def stream_annotation(filename):
    return send_from_directory(ANNOTATIONS_DATA_PATH, filename, conditional=True, mimetype='binary/octet-stream')