from __future__ import annotations

from db.embedded_docs import CommonName, OrganismImage, Publication
from db.model import (
    Assembly,
    BioGenomeUser,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    OrganismPrincipal,
    ReadRun,
    TaxonNode,
)
from services.organism_audit_log import organism_snapshot, record_organism_audit
from services.publications import has_linked_assembly, validate_publication_or_raise
from db.constants import GOAT_PROJECT_NAME
from db.enums import GoaTStatus
from helpers import taxonomy as taxonomy_helper, user as user_helper, organism as organism_helper, geolocation as geoloc_helper, data as data_helper
from helpers import resource_mixins as response_helper
from helpers.rest_catalog_sync import (
    cascade_delete_organism,
    sync_species_after_catalog_change,
    touch_goat_update_date,
)
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from mongoengine.errors import NotUniqueError, ValidationError
import logging
import os
from typing import Optional
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

def _goat_status_scalar(status) -> Optional[str]:
    if status is None:
        return None
    if isinstance(status, GoaTStatus):
        return status.value
    text = str(status).strip()
    return text or None


def _touch_goat_update_date_on_manual_goat_status_change(
    taxid: str, previous, new
) -> None:
    if not GOAT_PROJECT_NAME:
        return
    if _goat_status_scalar(previous) == _goat_status_scalar(new):
        return
    touch_goat_update_date(taxid)


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
    previous_snapshot = organism_snapshot(organism)

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

    previous_goat_status = (
        getattr(organism, "goat_status", None)
        if "goat_status" in organism_data
        else None
    )

    for k, v in organism_data.items():
        setattr(organism, k, v)

    if "goat_status" in organism_data:
        _touch_goat_update_date_on_manual_goat_status_change(
            taxid, previous_goat_status, organism_data["goat_status"]
        )

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

    try:
        organism.reload()
    except Exception:
        pass
    record_organism_audit(
        action="update",
        taxid=str(organism.taxid),
        scientific_name=str(organism.scientific_name or ""),
        previous_object=previous_snapshot,
        new_object=organism_snapshot(organism),
    )

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
        from jobs.support.organism_enrich import run_enrich_followup_for_taxids

        run_enrich_followup_for_taxids([taxid])
    except Exception:
        logger.exception(
            "create_organism: failed post-taxonomy enrichment for taxid=%s",
            taxid,
        )

    try:
        organism.reload()
    except Exception:
        pass
    record_organism_audit(
        action="create",
        taxid=str(organism.taxid),
        scientific_name=str(organism.scientific_name or ""),
        previous_object=None,
        new_object=organism_snapshot(organism),
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
        "common_names",
        "publications",
        "genome_publication",
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
        validate_publication_or_raise(
            item.get("source"), item.get("id"), context=f"publications[{idx}]"
        )
        out.append(Publication(**item))
    return out


def _coerce_genome_publication(value, taxid):
    """
    Validate and coerce the single ``genome_publication`` field.

    ``None``/``{}`` clears the field without validation (always allowed). Otherwise
    the organism must already have at least one linked assembly, and the
    publication must resolve against a supported source (DOI, PubMed, PubMed
    Central) — both checks raise ``BadRequest`` to block the save.
    """
    if value is None or value == {}:
        return None
    if not isinstance(value, dict):
        raise BadRequest(description="'genome_publication' must be an object or null")
    if "id" not in value or not str(value.get("id") or "").strip():
        raise BadRequest(description="'genome_publication.id' is required")
    if not has_linked_assembly(taxid):
        raise BadRequest(
            description=(
                "Cannot set a genome publication: no assembly is linked to this "
                "organism yet."
            )
        )
    validate_publication_or_raise(
        value.get("source"), value.get("id"), context="genome_publication"
    )
    return Publication(**value)


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

    if field in {"image_urls", "links", "countries"}:
        if value is None:
            return field, []
        if not isinstance(value, list):
            raise BadRequest(description=f"'{field}' must be an array")
        return field, [v.strip() for v in value if isinstance(v, str) and v.strip()]

    if field == "common_names":
        return "common_names", _coerce_common_names_list(value)

    if field == "publications":
        return "publications", _coerce_publications_list(value)

    if field == "genome_publication":
        return "genome_publication", _coerce_genome_publication(value, taxid)

    if field == "images":
        return "images", _coerce_images_list(value)

    raise BadRequest(description=f"Unsupported patch field '{field}'")


def patch_organism(data, taxid):
    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
    previous_snapshot = organism_snapshot(organism)
    field, value = parse_single_field_patch_payload(data)
    previous_goat_status = (
        getattr(organism, "goat_status", None) if field == "goat_status" else None
    )
    try:
        mapped_field, mapped_value = _map_single_organism_field(field, value, taxid)
        setattr(organism, mapped_field, mapped_value)
        if mapped_field == "goat_status":
            _touch_goat_update_date_on_manual_goat_status_change(
                taxid, previous_goat_status, mapped_value
            )
        organism.save()
    except BadRequest:
        raise
    except ValidationError as e:
        raise BadRequest(description=f"{e}")
    except TypeError as e:
        raise BadRequest(description=f"Invalid payload for '{field}': {e}")
    except Exception as e:
        raise BadRequest(description=f"{e}")
    try:
        organism.reload()
    except Exception:
        pass
    record_organism_audit(
        action="patch",
        taxid=str(organism.taxid),
        scientific_name=str(organism.scientific_name or ""),
        previous_object=previous_snapshot,
        new_object=organism_snapshot(organism),
    )
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

    if "genome_publication" in data:
        organism["genome_publication"] = _coerce_genome_publication(
            data["genome_publication"], taxid
        )

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
    previous_snapshot = organism_snapshot(organism_to_delete)
    del_taxid = str(organism_to_delete.taxid)
    del_name = str(organism_to_delete.scientific_name or "")
    cascade_delete_organism(organism_to_delete)
    record_organism_audit(
        action="delete",
        taxid=del_taxid,
        scientific_name=del_name,
        previous_object=previous_snapshot,
        new_object=None,
    )
    return f"Organisms {taxid} succesfully deleted", 200


def assigned_organism_taxids() -> list[str]:
    """Union of all taxids listed on BioGenomeUser.species (string-normalized)."""
    taxids: set[str] = set()
    for user in BioGenomeUser.objects.only("species").no_cache():
        for species_id in user.species or []:
            taxid = str(species_id).strip()
            if taxid:
                taxids.add(taxid)
    return list(taxids)


def get_unassigned_organisms(format='json',filter=None, limit=20, offset=0):
    assigned_taxids = assigned_organism_taxids()
    offset = int(offset)
    limit = int(limit)
    # pi_* columns stay empty for unassigned rows (no curator → no principal projection)
    # but keep the TSV schema aligned with the assigned/all exports.
    fields = [
        'scientific_name', 'taxid', 'sub_project',
        'metadata', 'insdc_status', 'goat_status', 'target_list_status',
        'pi_names', 'pi_institutes', 'pi_programs',
    ]
    if assigned_taxids:
        organisms = Organism.objects(taxid__not__in=assigned_taxids)
    else:
        organisms = Organism.objects()
    if filter:
        organisms = organisms.filter(data_helper.query_visitors.organism_query(filter))
    return response_helper.generate_response(format, fields, organisms, limit, offset)


def _build_organism_and_principal_maps(
    users,
) -> tuple[dict[str, list[str]], dict[str, list[str]]]:
    """
    Single pass over ``users`` building both the taxid -> assigned usernames map and the
    username -> principal slugs map (used to project ``principals[]`` onto organism rows
    via assigned curators; see docs/cbp-pi-contributor-migration.md).
    """
    organism_to_users: dict[str, list[str]] = {}
    user_to_principal_slugs: dict[str, list[str]] = {}
    for user in users:
        for species_id in user.species or []:
            taxid = str(species_id).strip()
            if not taxid:
                continue
            organism_to_users.setdefault(taxid, []).append(user.name)
        slugs = [str(s).strip() for s in (user.principal_ids or []) if str(s).strip()]
        if slugs:
            user_to_principal_slugs[user.name] = slugs
    return organism_to_users, user_to_principal_slugs


def load_principals_by_slug(slugs) -> dict[str, dict]:
    """Batch-load ``OrganismPrincipal`` rows for the given slugs, keyed by slug."""
    unique_slugs = {s for s in slugs if s}
    if not unique_slugs:
        return {}
    docs = OrganismPrincipal.objects(slug__in=list(unique_slugs)).only(
        "slug", "name", "affiliations", "programs"
    )
    return {
        doc.slug: {
            "slug": doc.slug,
            "name": doc.name,
            "affiliations": list(doc.affiliations or []),
            "programs": list(doc.programs or []),
        }
        for doc in docs
    }


def _principals_for_assigned_users(
    assigned_users: list[str],
    user_to_principal_slugs: dict[str, list[str]],
    principals_by_slug: dict[str, dict],
) -> list[dict]:
    seen: set[str] = set()
    principals: list[dict] = []
    for user_name in assigned_users:
        for slug in user_to_principal_slugs.get(user_name, []):
            if slug in seen:
                continue
            principal = principals_by_slug.get(slug)
            if not principal:
                continue
            seen.add(slug)
            principals.append(principal)
    return principals


def _dedupe_preserve_order(values) -> list[str]:
    """Order-preserving unique non-empty strings (for TSV / row flattening)."""
    seen: set[str] = set()
    out: list[str] = []
    for raw in values:
        text = str(raw).strip() if raw is not None else ""
        if not text or text in seen:
            continue
        seen.add(text)
        out.append(text)
    return out


def _flatten_principal_fields(principals: list[dict]) -> dict[str, str]:
    """Comma-joined PI name / institute / program strings for table rows and TSV."""
    names = _dedupe_preserve_order(p.get("name") for p in principals)
    institutes = _dedupe_preserve_order(
        aff for p in principals for aff in (p.get("affiliations") or [])
    )
    programs = _dedupe_preserve_order(
        prog for p in principals for prog in (p.get("programs") or [])
    )
    return {
        "pi_names": ", ".join(names),
        "pi_institutes": ", ".join(institutes),
        "pi_programs": ", ".join(programs),
    }


def _taxids_for_selected_users(
    selected_users: set[str],
    organism_to_users: dict[str, list[str]],
) -> set[str]:
    """Taxids assigned to any of the selected curator usernames."""
    if not selected_users:
        return set()
    taxids: set[str] = set()
    for taxid, usernames in organism_to_users.items():
        if any(name in selected_users for name in usernames):
            taxids.add(taxid)
    return taxids


def _taxids_for_selected_principals(
    selected_principal_slugs: set[str],
    organism_to_users: dict[str, list[str]],
    user_to_principal_slugs: dict[str, list[str]],
) -> set[str]:
    """
    Taxids whose assigned curators have any of the selected ``OrganismPrincipal`` slugs.
    OR within the principal facet.
    """
    if not selected_principal_slugs:
        return set()
    matching_users = {
        user_name
        for user_name, slugs in user_to_principal_slugs.items()
        if selected_principal_slugs.intersection(slugs)
    }
    if not matching_users:
        return set()
    return _taxids_for_selected_users(matching_users, organism_to_users)


def _organism_row_with_users(
    organism,
    organism_to_users: dict[str, list[str]],
    user_to_principal_slugs: dict[str, list[str]],
    principals_by_slug: dict[str, dict],
) -> dict:
    taxid = str(organism.taxid).strip()
    row = {k: v for k, v in organism.to_mongo().to_dict().items()}
    assigned_users = list(organism_to_users.get(taxid, []))
    row["assigned_users"] = assigned_users
    principals = _principals_for_assigned_users(
        assigned_users, user_to_principal_slugs, principals_by_slug
    )
    row["principals"] = principals
    row.update(_flatten_principal_fields(principals))
    return row


def get_organisms_with_users_list(args, *, assigned_only=True):
    query = {**args}
    fields = [
        'scientific_name', 'taxid', 'assigned_users', 'sub_project',
        'metadata', 'insdc_status', 'goat_status', 'target_list_status',
        'pi_names', 'pi_institutes', 'pi_programs',
    ]
    output_format = query.pop('format', 'json')
    user_filter = query.pop('name__in', None)
    principal_filter = query.pop('principal__in', None)
    organism_filter = query.pop('filter', None)

    selected_users = (
        {name.strip() for name in user_filter.split(',') if name.strip()}
        if user_filter
        else set()
    )
    selected_principals = (
        {slug.strip() for slug in principal_filter.split(',') if slug.strip()}
        if principal_filter
        else set()
    )
    users = BioGenomeUser.objects.only('name', 'species', 'principal_ids').no_cache()

    organism_to_users, user_to_principal_slugs = _build_organism_and_principal_maps(users)
    principals_by_slug = load_principals_by_slug(
        slug for slugs in user_to_principal_slugs.values() for slug in slugs
    )

    curator_taxids = _taxids_for_selected_users(selected_users, organism_to_users)
    principal_taxids = _taxids_for_selected_principals(
        selected_principals, organism_to_users, user_to_principal_slugs
    )

    # Faceted AND across curator + principal filters; OR within each facet.
    if selected_users and selected_principals:
        filtered_taxids = curator_taxids & principal_taxids
        query['taxid__in'] = list(filtered_taxids)
    elif selected_users:
        query['taxid__in'] = list(curator_taxids)
    elif selected_principals:
        query['taxid__in'] = list(principal_taxids)
    elif assigned_only:
        organism_ids = list(organism_to_users.keys())
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
        'metadata',
        'insdc_status',
        'goat_status',
        'target_list_status',
        'pending_deletion',
    )

    if q:
        organisms = organisms.filter(q)

    total = organisms.count()

    def iter_payload(queryset):
        for organism in queryset:
            yield _organism_row_with_users(
                organism, organism_to_users, user_to_principal_slugs, principals_by_slug
            )

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


def get_assigned_organisms(args):
    return get_organisms_with_users_list(args, assigned_only=True)


def get_all_organisms_with_users(args):
    return get_organisms_with_users_list(args, assigned_only=False)


def get_organisms_with_user(args):
    translated = dict(args)
    if translated.get('user__icontains'):
        translated['name__in'] = translated.pop('user__icontains')
    if translated.get('filter__icontains'):
        translated['filter'] = translated.pop('filter__icontains')
    return get_assigned_organisms(translated)

def create_organism_to_delete(taxid):
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description='User Not Found')

    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
    updated = Organism.objects(taxid=taxid, pending_deletion__ne=True).update(
        set__pending_deletion=True
    )
    if not updated:
        raise Conflict(description=f"Request to delete {organism.scientific_name} already present")

    record_organism_audit(
        action="request_deletion",
        taxid=str(organism.taxid),
        scientific_name=str(organism.scientific_name or ""),
        previous_object={"pending_deletion": False},
        new_object={"pending_deletion": True},
    )
    return f"Request to delete organism {taxid} successfully sent"

def delete_organism_to_delete(taxid):
    organism = get_or_404(Organism, f"Organism {taxid} not found!", taxid=taxid)
    organism.modify(pending_deletion=False)
    record_organism_audit(
        action="deny_deletion",
        taxid=str(organism.taxid),
        scientific_name=str(organism.scientific_name or ""),
        previous_object={"pending_deletion": True},
        new_object={"pending_deletion": False},
    )
    return f"Deletion request for organism {taxid} denied"
