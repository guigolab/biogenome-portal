
from db.embedded_docs import CommonName, Publication
from db.model import (
    Assembly,
    BioGenomeUser,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)
from db.constants import GOAT_PROJECT_NAME
from helpers import taxonomy as taxonomy_helper, user as user_helper, organism as organism_helper, geolocation as geoloc_helper, data as data_helper
from helpers import resource_mixins as response_helper
from helpers.rest_catalog_sync import cascade_delete_organism, sync_species_after_catalog_change
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from mongoengine.errors import ValidationError
import os 
from helpers.service_utils import get_or_404

PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')

MODEL_LIST = {
    'assemblies':{'model':Assembly, 'id':'accession'},
    'annotations':{'model':GenomeAnnotation, 'id':'name'},
    'biosamples':{'model':BioSample, 'id':'accession'},
    'local_samples':{'model':LocalSample, 'id':'local_id'},
    'reads':{'model':ReadRun, 'id':'run_accession'},
    }

def get_organism_related_data(taxid, model, args):
    get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)

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
    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)

    organism_data = map_organism_data(data,taxid)
    for k, v in organism_data.items():
        setattr(organism, k, v)
    try:
        organism.save()
    except Exception as e:
        raise BadRequest(description=f"{e}")
    lineage = list(organism.taxon_lineage) if organism.taxon_lineage else None
    sync_species_after_catalog_change(
        taxid,
        lineage,
        apply_goat_inference=bool(GOAT_PROJECT_NAME),
    )
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
        for k, v in organism_data.items():
            setattr(organism, k, v)
        organism.save()
    except ValidationError as e:
        Organism.objects(taxid=taxid).delete()
        return f"{e}", 400
    except Exception as e:
        Organism.objects(taxid=taxid).delete()
        return f"{e}", 400

    # Same tail as REST ingest (e.g. assemblies): denorm counts + insdc/goat status on the
    # species row, then recompute TaxonNode aggregates (including organisms_count) for this
    # taxid and its lineage keys.
    lineage = list(organism.taxon_lineage) if organism.taxon_lineage else None
    try:
        sync_species_after_catalog_change(
            taxid,
            lineage,
            apply_goat_inference=bool(GOAT_PROJECT_NAME),
        )
    except Exception as e:
        return f"Organism created but status sync failed: {e}", 500

    if user:
        user_helper.add_species_to_datamanager([taxid], user)
    return f"organism {taxid} created", 201

# Scalar string fields on Organism that the API may set from JSON (exclude derived counters / insdc_status).
_ORGANISM_STRING_FIELD_KEYS = frozenset(
    {
        "sub_project",
        "tolid_prefix",
        "insdc_common_name",
        "scientific_name",
        "taxid",
        "goat_status",
        "target_list_status",
    }
)


def map_organism_data(data, taxid):
    """
    Map JSON body to fields for Organism create/update.

    Do not drop keys with "falsy" values: empty ``[]``, ``{}``, or ``""`` are valid
    (e.g. clear gallery URLs or metadata). Only JSON ``null`` (Python ``None``) is skipped
    for optional scalars so we do not overwrite with null unless the key is present.
    """
    if not isinstance(data, dict):
        data = {}
    organism = {}

    if "image" in data:
        raw = data["image"]
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            organism["image"] = None
            geoloc_helper.add_image(taxid, None)
        else:
            organism["image"] = raw.strip() if isinstance(raw, str) else raw
            geoloc_helper.add_image(taxid, organism["image"])

    for key in _ORGANISM_STRING_FIELD_KEYS:
        if key not in data:
            continue
        if key == "goat_status" and not GOAT_PROJECT_NAME:
            continue
        val = data[key]
        if val is None:
            continue
        if isinstance(val, str):
            organism[key] = val
        elif isinstance(val, (int, float)) and key == "taxid":
            # JSON may send taxid as a number; MongoEngine StringField needs a str.
            organism[key] = str(int(val))

    if "metadata" in data:
        meta = data["metadata"]
        organism["metadata"] = meta if isinstance(meta, dict) else {}

    if "sequencing_type" in data:
        st = data["sequencing_type"]
        organism["sequencing_type"] = list(st) if st is not None else []

    if "image_urls" in data:
        urls = data["image_urls"]
        if urls is None:
            organism["image_urls"] = []
        else:
            # Drop blanks so ListField(URLField) does not reject the whole save.
            organism["image_urls"] = [
                u.strip()
                for u in urls
                if isinstance(u, str) and u.strip()
            ]

    if "common_names" in data:
        cnames = data["common_names"]
        if not cnames:
            organism["common_names"] = []
        else:
            organism["common_names"] = [
                CommonName(**c_name)
                for c_name in cnames
                if isinstance(c_name, dict) and "value" in c_name
            ]

    if "publications" in data:
        pubs = data["publications"]
        if not pubs:
            organism["publications"] = []
        else:
            organism["publications"] = [
                Publication(**pub) for pub in pubs if isinstance(pub, dict) and "id" in pub
            ]

    return organism

#map lineage into tree structure
def map_organism_lineage(lineage):
    root_to_organism = list(reversed(lineage))
    tree={}
    root = TaxonNode.objects(taxid=root_to_organism[0]).first()
    tree = taxonomy_helper.dfs_generator(root)
    return tree

def delete_organism(taxid):
    organism_to_delete = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
    cascade_delete_organism(organism_to_delete)
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
    return response_helper.generate_response(format, fields, organisms, limit, offset)

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
    limit, offset = response_helper.get_pagination(query)
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
        return response_helper.stream_tsv(iter_payload(organisms.no_cache()), fields), "text/tab-separated-values"
    elif output_format == 'jsonl':
        return response_helper.generate_jsonlines(iter_payload(organisms.no_cache())), "application/jsonlines"

    response_data = list(iter_payload(organisms.skip(offset).limit(limit)))

    # Return JSON response with pagination
    response = {
        "total": total,
        "data": response_data
    }
    return response_helper.dump_json(response), "application/json"


def get_organisms_with_user(args):
    translated = dict(args)
    if translated.get('user__icontains'):
        translated['name__in'] = translated.pop('user__icontains')
    if translated.get('filter__icontains'):
        translated['filter'] = translated.pop('filter__icontains')
    return get_assigned_organisms(translated)

def create_organism_to_delete(taxid):
    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description='User Not Found')
    
    if organism.pending_deletion:
        raise Conflict(description=f"Request to delete {organism.scientific_name} already present")
    
    organism.modify(pending_deletion=True)
    return f"Request to delete organism {taxid} successfully sent"

def delete_organism_to_delete(taxid):
    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
    organism.modify(pending_deletion=False)
    return f"request to delete organism {taxid}, successfully deleted"
