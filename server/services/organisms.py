
from db.embedded_docs import CommonName, OrganismImage, Publication
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
from mongoengine.errors import NotUniqueError, ValidationError
import logging
import os
from helpers.service_utils import get_or_404

logger = logging.getLogger(__name__)

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

def _mongo_validation_message(exc: ValidationError) -> str:
    to_dict = getattr(exc, "to_dict", None)
    if callable(to_dict):
        try:
            return str(to_dict())
        except Exception:
            pass
    return str(exc) or "Validation failed"


def update_organism(data, taxid):
    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)

    if data is None:
        raise BadRequest(description="Request body is required (send a JSON object)")
    if not isinstance(data, dict):
        raise BadRequest(description="Organism update payload must be a JSON object")

    try:
        organism_data = map_organism_data(data, taxid)
    except BadRequest:
        raise

    if not organism_data:
        return taxid

    for k, v in organism_data.items():
        setattr(organism, k, v)

    try:
        organism.save()
    except ValidationError as e:
        raise BadRequest(description=_mongo_validation_message(e)) from e
    except NotUniqueError as e:
        raise BadRequest(
            description="Another organism already uses this taxid or scientific name."
        ) from e
    except Exception as e:
        logger.exception("organism update save failed taxid=%s", taxid)
        raise BadRequest(
            description="Could not persist organism update. Check field types and constraints."
        ) from e

    return taxid

def create_organism(data):
    if not isinstance(data, dict):
        raise BadRequest(description="Organism create payload must be a JSON object")
    taxid = data.get('taxid')
    if not taxid:
        raise BadRequest(description="taxid is mandatory")
    taxid = str(taxid)
    if Organism.objects(taxid=taxid):
        raise BadRequest(description=f"An organisms with taxid {taxid} already exists")

    user = user_helper.get_current_user()
            
    organism = organism_helper.create_organism_and_related_taxons(taxid)
    if not organism:
        raise BadRequest(description=f"Organisms with taxid {taxid} not found in INSDC")

    try:
        organism_data = map_organism_data(data, taxid)
    except BadRequest:
        Organism.objects(taxid=taxid).delete()
        raise
    try:
        for k, v in organism_data.items():
            setattr(organism, k, v)
        organism.save()
    except ValidationError as e:
        Organism.objects(taxid=taxid).delete()
        raise BadRequest(description=_mongo_validation_message(e)) from e
    except NotUniqueError:
        Organism.objects(taxid=taxid).delete()
        raise BadRequest(
            description="Another organism already uses this taxid or scientific name."
        )
    except Exception as e:
        Organism.objects(taxid=taxid).delete()
        logger.exception("organism create save failed taxid=%s", taxid)
        raise BadRequest(
            description="Could not save new organism. Check field types and constraints."
        ) from e

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
        logger.exception("organism create status sync failed taxid=%s", taxid)
        raise BadRequest(
            description=(
                "Organism created but catalog status sync failed. "
                "Please retry sync jobs or contact an administrator."
            )
        ) from e

    if user:
        user_helper.add_species_to_datamanager([taxid], user)

    try:
        from jobs.taxonomy import enrich_organisms_post_taxonomy

        enrich_organisms_post_taxonomy.delay([taxid])
    except Exception:
        logger.exception(
            "create_organism: failed to queue post-taxonomy enrichment for taxid=%s",
            taxid,
        )

    return taxid

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

_ORGANISM_PATCHABLE_FIELDS = frozenset(
    _ORGANISM_STRING_FIELD_KEYS
    | {
        "image",
        "image_urls",
        "images",
        "metadata",
        "sequencing_type",
        "common_names",
        "publications",
        "links",
        "countries",
    }
)


def _coerce_common_names_list(value):
    if value is None:
        return []
    if not isinstance(value, list):
        raise BadRequest(description="'common_names' must be an array")
    out = []
    for idx, item in enumerate(value):
        if not isinstance(item, dict):
            raise BadRequest(description=f"'common_names[{idx}]' must be an object")
        if "value" not in item:
            raise BadRequest(description=f"'common_names[{idx}].value' is required")
        out.append(CommonName(**item))
    return out


def _coerce_publications_list(value):
    if value is None:
        return []
    if not isinstance(value, list):
        raise BadRequest(description="'publications' must be an array")
    out = []
    for idx, item in enumerate(value):
        if not isinstance(item, dict):
            raise BadRequest(description=f"'publications[{idx}]' must be an object")
        if "id" not in item:
            raise BadRequest(description=f"'publications[{idx}].id' is required")
        out.append(Publication(**item))
    return out


def _coerce_images_list(value):
    if value is None:
        return []
    if not isinstance(value, list):
        raise BadRequest(description="'images' must be an array")
    out = []
    for idx, item in enumerate(value):
        if not isinstance(item, dict):
            raise BadRequest(description=f"'images[{idx}]' must be an object")
        if not item.get("url"):
            raise BadRequest(description=f"'images[{idx}].url' is required")
        try:
            out.append(OrganismImage(**item))
        except TypeError as e:
            raise BadRequest(description=f"'images[{idx}]': {e}") from e
    return out


def parse_single_field_patch_payload(data):
    """
    Parse PATCH body and ensure it targets exactly one Organism field.

    Accepted payload shapes:
    - {"images": [...]}  # exactly one key
    - {"field": "images", "value": [...]}  # explicit shape
    """
    if not isinstance(data, dict):
        raise BadRequest(description="PATCH payload must be a JSON object")
    if not data:
        raise BadRequest(description="PATCH payload cannot be empty")

    if set(data.keys()) == {"field", "value"}:
        field = data.get("field")
        value = data.get("value")
    else:
        if len(data) != 1:
            raise BadRequest(
                description="PATCH payload must update exactly one field"
            )
        field, value = next(iter(data.items()))

    if not isinstance(field, str) or not field.strip():
        raise BadRequest(description="'field' must be a non-empty string")
    field = field.strip()
    if field not in _ORGANISM_PATCHABLE_FIELDS:
        allowed = ", ".join(sorted(_ORGANISM_PATCHABLE_FIELDS))
        raise BadRequest(
            description=f"'{field}' is not patchable. Allowed fields: {allowed}"
        )
    return field, value


def _map_single_organism_field(field, value, taxid):
    """
    Map a single PATCH field into a validated Organism field assignment.
    """
    if field == "goat_status" and not GOAT_PROJECT_NAME:
        raise BadRequest(description="'goat_status' cannot be updated in this deployment")

    if field in _ORGANISM_STRING_FIELD_KEYS:
        if value is None:
            return field, None
        if isinstance(value, str):
            return field, value
        if isinstance(value, (int, float)) and field == "taxid":
            return field, str(int(value))
        raise BadRequest(description=f"'{field}' must be a string")

    if field == "image":
        if value is None or (isinstance(value, str) and not value.strip()):
            geoloc_helper.add_image(taxid, None)
            return "image", None
        if not isinstance(value, str):
            raise BadRequest(description="'image' must be a URL string or null")
        image_value = value.strip()
        geoloc_helper.add_image(taxid, image_value)
        return "image", image_value

    if field == "metadata":
        if value is None:
            return "metadata", {}
        if not isinstance(value, dict):
            raise BadRequest(description="'metadata' must be an object")
        return "metadata", value

    if field in {"sequencing_type", "image_urls", "links", "countries"}:
        if value is None:
            return field, []
        if not isinstance(value, list):
            raise BadRequest(description=f"'{field}' must be an array")
        return field, [v.strip() for v in value if isinstance(v, str) and v.strip()]

    if field == "common_names":
        return "common_names", _coerce_common_names_list(value)

    if field == "publications":
        return "publications", _coerce_publications_list(value)

    if field == "images":
        return "images", _coerce_images_list(value)

    raise BadRequest(description=f"Unsupported patch field '{field}'")


def patch_organism(data, taxid):
    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
    field, value = parse_single_field_patch_payload(data)
    try:
        mapped_field, mapped_value = _map_single_organism_field(field, value, taxid)
        setattr(organism, mapped_field, mapped_value)
        organism.save()
    except BadRequest:
        raise
    except ValidationError as e:
        raise BadRequest(description=f"{e}")
    except TypeError as e:
        raise BadRequest(description=f"Invalid payload for '{field}': {e}")
    except Exception as e:
        raise BadRequest(description=f"{e}")
    return taxid, field


def map_organism_data(data, taxid):
    """
    Map JSON body to fields for Organism create/update.

    Raises ``BadRequest`` when a present field has an invalid type or shape.

    Empty ``[]`` / ``{}`` clear list or dict fields when the key is sent. JSON ``null`` for
    optional scalars skips updating that field (key absent behaviour).
    """
    if not isinstance(data, dict):
        raise BadRequest(description="Organism payload must be a JSON object")

    organism = {}

    if "image" in data:
        raw = data["image"]
        if raw is None or (isinstance(raw, str) and not raw.strip()):
            organism["image"] = None
            geoloc_helper.add_image(taxid, None)
        else:
            if not isinstance(raw, str):
                raise BadRequest(description="'image' must be a string or null")
            organism["image"] = raw.strip()
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
            organism[key] = str(int(val))
        else:
            raise BadRequest(description=f"'{key}' must be a string or number (for taxid)")

    if "metadata" in data:
        meta = data["metadata"]
        if meta is None:
            organism["metadata"] = {}
        elif isinstance(meta, dict):
            organism["metadata"] = meta
        else:
            raise BadRequest(description="'metadata' must be an object or null")

    if "sequencing_type" in data:
        st = data["sequencing_type"]
        if st is None:
            organism["sequencing_type"] = []
        elif isinstance(st, list):
            organism["sequencing_type"] = [str(x) for x in st if x is not None]
        else:
            raise BadRequest(description="'sequencing_type' must be an array or null")

    if "image_urls" in data:
        urls = data["image_urls"]
        if urls is None:
            organism["image_urls"] = []
        elif isinstance(urls, list):
            organism["image_urls"] = [
                u.strip()
                for u in urls
                if isinstance(u, str) and u.strip()
            ]
        else:
            raise BadRequest(description="'image_urls' must be an array or null")

    if "links" in data:
        raw = data["links"]
        if raw is None:
            organism["links"] = []
        elif isinstance(raw, list):
            organism["links"] = [u.strip() for u in raw if isinstance(u, str) and u.strip()]
        else:
            raise BadRequest(description="'links' must be an array or null")

    if "countries" in data:
        raw = data["countries"]
        if raw is None:
            organism["countries"] = []
        elif isinstance(raw, list):
            organism["countries"] = [str(c).strip() for c in raw if c is not None and str(c).strip()]
        else:
            raise BadRequest(description="'countries' must be an array or null")

    if "images" in data:
        organism["images"] = _coerce_images_list(data["images"])

    if "common_names" in data:
        organism["common_names"] = _coerce_common_names_list(data["common_names"])

    if "publications" in data:
        organism["publications"] = _coerce_publications_list(data["publications"])

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
