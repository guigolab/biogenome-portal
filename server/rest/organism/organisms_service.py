
from db.models import CommonName,TaxonNode, Organism, Publication,Assembly,GenomeAnnotation,BioSample,LocalSample,ReadRun,BioGenomeUser
from helpers import taxonomy as taxonomy_helper, user as user_helper, organism as organism_helper, geolocation as geoloc_helper, data as data_helper
from helpers.taxon_organism_sync import sync_organism_status_and_taxon_counts
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from mongoengine.errors import ValidationError
import os 
from rest.common.service_utils import get_or_404

PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

MODEL_LIST = {
    'assemblies':{'model':Assembly, 'id':'accession'},
    'annotations':{'model':GenomeAnnotation, 'id':'name'},
    'biosamples':{'model':BioSample, 'id':'accession'},
    'local_samples':{'model':LocalSample, 'id':'local_id'},
    'reads':{'model':ReadRun, 'id':'run_accession'},
    }

def get_organism(taxid):
    return get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)

def get_organism_related_data(taxid, model, args):

    get_organism(taxid)

    if not model in MODEL_LIST.keys():
        raise BadRequest(description=f"{model} is not in {' '.join(MODEL_LIST.keys())}")
    
    mapped_model = MODEL_LIST.get(model)
    model_key = model if model in data_helper.MODEL_MAPPER else None
    queryset = mapped_model.get('model').objects(taxid=taxid)
    if model_key:
        default_fields = data_helper.MODEL_MAPPER[model_key]['tsv_fields']
        return data_helper.get_related_items(
            queryset,
            args,
            fields=default_fields,
            allowed_fields=None,
            default_sort_column=mapped_model.get('id'),
        )
    return data_helper.get_related_items(
        queryset,
        args,
        fields=[mapped_model.get('id')],
        allowed_fields=None,
        default_sort_column=mapped_model.get('id'),
    )

def update_organism(data, taxid):
    organism = get_organism(taxid)

    organism_data = map_organism_data(data,taxid)
    for k, v in organism_data.items():
        setattr(organism, k, v)
    try:
        organism.save()
    except Exception as e:
        raise BadRequest(description=f"{e}")
    return taxid

def create_organism(data):
    taxid = data.get('taxid')
    if not taxid:
        return "taxid is mandatory", 400
    taxid = str(taxid)
    if Organism.objects(taxid=taxid):
        return f"An organisms with taxid {taxid} already exists", 400

    user = user_helper.get_current_user()
            
    organism = organism_helper.create_organism_and_related_taxons(taxid)
    if not organism:
        return f"Organisms with taxid {taxid} not found in INSDC", 400
    
    organism_data = map_organism_data(data, taxid)
    try:
        organism.update(**organism_data)
        sync_organism_status_and_taxon_counts(taxid)
        if user:
            user_helper.add_species_to_datamanager([taxid], user)
        return f"organism {taxid} created" , 201
    except ValidationError as e:
        Organism.objects(taxid=taxid).delete()
        return f"{e}", 400

def map_organism_data(data,taxid):
    organism = dict()
    filtered_data = {k: v for k, v in data.items() if v}

    string_attrs = {k: v for k, v in filtered_data.items() if isinstance(v, str)}

    image = filtered_data.get('image')

    organism['image'] = image
    geoloc_helper.add_image(taxid, image)

    for key, value in string_attrs.items():
        organism[key] = value

    organism['metadata'] = filtered_data.get('metadata')
    organism['common_names'] = None
    organism['sequencing_type'] = filtered_data.get('sequencing_type',[])
    if filtered_data.get('common_names'):
        organism['common_names'] = [CommonName(**c_name) for c_name in filtered_data['common_names'] if 'value' in c_name]
    organism['image_urls'] = filtered_data.get('image_urls')

    organism['publications'] = None
    if filtered_data.get('publications'):
        organism['publications'] = [Publication(**pub) for pub in filtered_data.get('publications', []) if 'id' in pub]
    return organism

#map lineage into tree structure
def map_organism_lineage(lineage):
    root_to_organism = list(reversed(lineage))
    tree={}
    root = TaxonNode.objects(taxid=root_to_organism[0]).first()
    tree = taxonomy_helper.dfs_generator(root)
    return tree

def delete_organism(taxid):
    organism_to_delete = get_organism(taxid)
    organism_to_delete.delete()
    return f"Organisms {taxid} succesfully deleted", 200
    
def get_unassigned_organisms(format='json',filter=None, limit=20, offset=0):
    users_taxids = BioGenomeUser.objects().distinct('species')
    offset = int(offset)
    limit = int(limit)
    fields = [
        'scientific_name', 'taxid', 'sub_project',
        'sequencing_type', 'insdc_status', 'goat_status', 'target_list_status'
    ]
    organisms = Organism.objects(taxid__not__in=users_taxids)
    if filter:
        organisms = organisms.filter(data_helper.query_visitors.organism_query(filter))
    return data_helper.generate_response(format, fields, organisms, limit, offset)

def get_assigned_organisms(args):
    query = {**args}
    fields = [
        'scientific_name', 'taxid', 'assigned_users', 'sub_project',
        'sequencing_type', 'insdc_status', 'goat_status', 'target_list_status'
    ]
    output_format = query.pop('format', 'json')
    user_filter = query.pop('name__in', None)
    organism_filter = query.pop('filter', None)

    selected_users = {name.strip() for name in user_filter.split(',')} if user_filter else set()
    users = BioGenomeUser.objects.only('name', 'species').no_cache()

    organism_to_users = {}
    filtered_taxids = set()
    for user in users:
        user_species = [str(species_id) for species_id in user.species]
        if selected_users and user.name in selected_users:
            filtered_taxids.update(user_species)
        for species_id in user_species:
            organism_to_users.setdefault(species_id, []).append(user.name)

    organism_ids = list(filtered_taxids) if selected_users else list(organism_to_users.keys())
    if organism_ids:
        query['taxid__in'] = organism_ids

    if organism_filter:
        organism_filter = data_helper.query_visitors.organism_query(organism_filter)

    # Apply pagination and query filters
    limit, offset = data_helper.get_pagination(query)
    query, q = data_helper.create_query(query, organism_filter)
    # Query the organisms
    organisms = Organism.objects(**query).only(
        'scientific_name',
        'taxid',
        'sub_project',
        'sequencing_type',
        'insdc_status',
        'goat_status',
        'target_list_status',
    )

    if q:
        organisms = organisms.filter(q)

    total = organisms.count()

    def iter_payload(queryset):
        for organism in queryset:
            payload = organism.to_mongo().to_dict()
            payload["assigned_users"] = organism_to_users.get(str(organism.taxid), [])
            yield payload

    # Handle different output formats
    if output_format == 'tsv':
        return data_helper.stream_tsv(iter_payload(organisms.no_cache()), fields), "text/tab-separated-values"
    elif output_format == 'jsonl':
        return data_helper.generate_jsonlines(iter_payload(organisms.no_cache())), "application/jsonlines"

    response_data = list(iter_payload(organisms.skip(offset).limit(limit)))

    # Return JSON response with pagination
    response = {
        "total": total,
        "data": response_data
    }
    return data_helper.dump_json(response), "application/json"


def get_organisms_with_user(args):
    translated = dict(args)
    if translated.get('user__icontains'):
        translated['name__in'] = translated.pop('user__icontains')
    if translated.get('filter__icontains'):
        translated['filter'] = translated.pop('filter__icontains')
    return get_assigned_organisms(translated)

def create_organism_to_delete(taxid):
    organism = get_organism(taxid)
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description='User Not Found')
    
    if organism.pending_deletion:
        raise Conflict(description=f"Request to delete {organism.scientific_name} already present")
    
    organism.modify(pending_deletion=True)
    return f"Request to delete organism {taxid} successfully sent"

def delete_organism_to_delete(taxid):
    organism = get_organism(taxid)
    organism.modify(pending_deletion=False)
    return f"request to delete organism {taxid}, successfully deleted"
