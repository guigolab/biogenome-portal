from mongoengine.queryset.visitor import Q
import json
from typing import List, Optional
from werkzeug.exceptions import BadRequest
from db.model import (
    Assembly,
    BioSample,
    BioSampleSubmission,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    SampleCoordinates,
    TaxonNode,
)
from helpers import geolocation as geolocation_helper
from helpers.rest_catalog_sync import sync_species_after_catalog_change
from . import query_visitors

MODEL_MAPPER = {
    "annotations": {
        "model": GenomeAnnotation,
        "query": query_visitors.annotation_query,
        "tsv_fields": ["name", "scientific_name", "taxid", "assembly_accession"],
        "default_sort_column": "name",
        "default_sort_order": "asc",
    },
    "assemblies": {
        "model": Assembly,
        "query": query_visitors.assembly_query,
        "tsv_fields": ["accession", "assembly_name", "scientific_name", "taxid"],
        "default_sort_column": "accession",
        "default_sort_order": "asc",
    },
    "biosamples": {
        "model": BioSample,
        "query": query_visitors.biosample_query,
        "tsv_fields": ["accession", "scientific_name", "taxid"],
        "default_sort_column": "accession",
        "default_sort_order": "asc",
    },
    "submitted_biosamples": {
        "model": BioSampleSubmission,
        "query": query_visitors.biosample_submission_query,
        "tsv_fields": ["accession", "name", "taxid", "scientific_name", "user"],
        "default_sort_column": "accession",
        "default_sort_order": "asc",
    },
    "reads": {
        "model": ReadRun,
        "query": query_visitors.read_run_query,
        "tsv_fields": [
            "run_accession",
            "experiment_accession",
            "sample_accession",
            "taxid",
            "scientific_name",
        ],
        "default_sort_column": "run_accession",
        "default_sort_order": "asc",
    },
    "local_samples": {
        "model": LocalSample,
        "query": query_visitors.local_sample_query,
        "tsv_fields": ["local_id", "scientific_name", "taxid"],
        "default_sort_column": "local_id",
        "default_sort_order": "asc",
    },
    "organisms": {
        "model": Organism,
        "query": query_visitors.organism_query,
        "tsv_fields": ["scientific_name", "taxid", "insdc_common_name"],
        "default_sort_column": "taxid",
        "default_sort_order": "asc",
    },
    "taxons": {
        "model": TaxonNode,
        "query": query_visitors.taxon_query,
        "tsv_fields": ["taxid", "name", "rank"],
        "default_sort_column": "taxid",
        "default_sort_order": "asc",
    },
}

# Keys allowed for GET /api/<catalog_model> and POST /api/<catalog_model>/query.
# Excludes JWT-gated collections that use different URL paths or custom handlers.
CATALOG_MODEL_KEYS = frozenset(MODEL_MAPPER.keys()) - frozenset(
    {"submitted_biosamples"}
)


def _insdc_counts_any_q(raw: str) -> Optional[Q]:
    """
    OR-combine count predicates for GET /organisms (portal status UI).

    Comma-separated codes: bio, reads, asm, ann, none
    (biosamples_count>0, reads_count>0, assemblies_count>0,
    genome_annotations_count>0, or none of those).
    """
    parts = [p.strip().lower() for p in raw.split(",") if p.strip()]
    if not parts:
        return None
    clauses: List[Q] = []
    for p in parts:
        if p == "bio":
            clauses.append(Q(biosamples_count__gt=0))
        elif p == "reads":
            clauses.append(Q(reads_count__gt=0))
        elif p == "asm":
            clauses.append(Q(assemblies_count__gt=0))
        elif p == "ann":
            clauses.append(Q(genome_annotations_count__gt=0))
        elif p == "none":
            has_any = (
                Q(biosamples_count__gt=0)
                | Q(reads_count__gt=0)
                | Q(assemblies_count__gt=0)
                | Q(genome_annotations_count__gt=0)
            )
            clauses.append(~has_any)
    if not clauses:
        return None
    combined = clauses[0]
    for c in clauses[1:]:
        combined |= c
    return combined


def _truthy_query_flag(value) -> bool:
    if value is None or value is False:
        return False
    if isinstance(value, str):
        return value.strip().lower() in ("1", "true", "yes", "on")
    return bool(value)


def _catalog_params_as_plain_dict(immutable_dict):
    """Flask ``request.args`` / MultiDict → flat dict so all query keys reach catalog filters."""
    if immutable_dict is None:
        return {}
    if hasattr(immutable_dict, "to_dict"):
        return immutable_dict.to_dict(flat=True)
    return dict(immutable_dict)


def _geojson_polygon_or_none(geo):
    """
    Return geo only if it is a usable Polygon / MultiPolygon for ``geo_within``.
    Rejects {}, GeometryCollection, etc., which would otherwise skip geo match and match all samples.
    """
    if not geo or not isinstance(geo, dict):
        return None
    t = geo.get("type")
    coords = geo.get("coordinates")
    if t not in ("Polygon", "MultiPolygon"):
        return None
    if not isinstance(coords, list) or len(coords) == 0:
        return None
    if t == "Polygon":
        ring0 = coords[0] if coords else None
        if not isinstance(ring0, list) or len(ring0) < 3:
            return None
    return geo


def _match_dict_from_organism_queryset(items):
    try:
        q = items._query
    except Exception:
        return {}
    if not q:
        return {}
    if isinstance(q, dict):
        return dict(q)
    return dict(q)


def _taxids_with_sample_locations_for_organism_match(org_match: dict):
    """
    Taxids of organisms matching ``org_match`` that have at least one SampleCoordinates row.
    Uses $lookup (no giant distinct $in list).
    """
    org_coll = Organism._get_collection()
    sc_name = SampleCoordinates._get_collection().name
    pipeline = [
        {"$match": org_match},
        {
            "$lookup": {
                "from": sc_name,
                "localField": "taxid",
                "foreignField": "taxid",
                "as": "_sc",
            }
        },
        {"$match": {"_sc": {"$ne": []}}},
        {"$project": {"taxid": 1, "_id": 0}},
    ]
    out = []
    seen = set()
    for doc in org_coll.aggregate(pipeline, allowDiskUse=True):
        t = doc.get("taxid")
        if t is None:
            continue
        s = str(t).strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def _organism_countries_in_q(codes):
    """
    Organism.countries is ListField(str): match organisms whose list contains any
    selected ISO alpha-2 code (OR). None in ``codes`` matches empty / missing list
    (same bucket as stats ``No Entry``).
    """
    if not codes:
        return None
    if not isinstance(codes, (list, tuple)):
        codes = [codes]
    parts = []
    for v in codes:
        if v is None:
            parts.append(
                Q(__raw__={"$or": [{"countries": {"$exists": False}}, {"countries": {"$size": 0}}]})
            )
        elif isinstance(v, str) and v.strip():
            parts.append(Q(countries=v.strip()))
    if not parts:
        return None
    combined = parts[0]
    for p in parts[1:]:
        combined |= p
    return combined


def _build_organism_queryset(immutable_dict, *, apply_sample_location_geo: bool):
    """
    Shared organism queryset for catalog and map.

    When ``apply_sample_location_geo`` is True, applies polygon / has_sample_locations
    (SampleCoordinates-backed filters). GET /organisms uses False; map list and
    frequency aggregation use True.
    """
    mapper = MODEL_MAPPER["organisms"]
    args = dict(_catalog_params_as_plain_dict(immutable_dict))

    filter = args.pop("filter", None)
    q_query = mapper.get("query")(filter) if filter else None

    for k in ("limit", "offset", "format", "fields", "sort_column", "sort_order"):
        args.pop(k, None)

    insdc_counts_any_raw = args.pop("insdc_counts_any", None)

    has_sample_locations = _truthy_query_flag(args.pop("has_sample_locations", None))

    polygon_geo = None
    raw_poly = args.pop("polygon", None)
    if raw_poly:
        if isinstance(raw_poly, str):
            try:
                polygon_geo = json.loads(raw_poly)
            except (json.JSONDecodeError, TypeError):
                raise BadRequest(description="polygon must be valid JSON geometry")
        elif isinstance(raw_poly, dict):
            polygon_geo = raw_poly

    polygon_geo = _geojson_polygon_or_none(polygon_geo)

    query, q_query = create_query(args, q_query)

    countries_in = query.pop("countries__in", None)
    items = Organism.objects(**query)

    if q_query:
        items = items.filter(q_query)

    countries_q = _organism_countries_in_q(countries_in)
    if countries_q is not None:
        items = items.filter(countries_q)

    if insdc_counts_any_raw:
        icq = _insdc_counts_any_q(str(insdc_counts_any_raw))
        if icq is not None:
            items = items.filter(icq)

    if not apply_sample_location_geo:
        return items

    # Map polygon filter: coordinates live on SampleCoordinates, not Organism.
    if polygon_geo is not None:
        geo_args = {"polygon": polygon_geo}
        taxon_lineage = args.get("taxon_lineage")
        if taxon_lineage:
            geo_args["taxid"] = taxon_lineage
        sample_q = geolocation_helper.create_query(geo_args)
        taxids = [
            str(t)
            for t in SampleCoordinates.objects(sample_q).distinct("taxid")
            if t is not None and str(t).strip()
        ]
        if not taxids:
            items = items.filter(taxid="__no_samples_in_map_selection__")
        else:
            items = items.filter(taxid__in=taxids)

    elif has_sample_locations:
        org_match = _match_dict_from_organism_queryset(items)
        taxids = _taxids_with_sample_locations_for_organism_match(org_match)
        if not taxids:
            items = items.filter(taxid="__no_samples_in_map_selection__")
        else:
            items = items.filter(taxid__in=taxids)

    return items


def organism_queryset_catalog_only(immutable_dict):
    """GET /organisms: catalog filters only (no polygon / has_sample_locations)."""
    return _build_organism_queryset(immutable_dict, apply_sample_location_geo=False)


def organism_queryset_for_map_filters(immutable_dict):
    """
    Organism queryset for catalog map / frequency: catalog filters plus polygon and/or
    has_sample_locations (SampleCoordinates), without pagination, sort, or projection.
    """
    return _build_organism_queryset(immutable_dict, apply_sample_location_geo=True)


def get_items(model, immutable_dict, *, organisms_sample_location_geo=False):
    from helpers import resource_mixins as rm

    try:
        mapper = MODEL_MAPPER.get(model)

        params = _catalog_params_as_plain_dict(immutable_dict)
        args = dict(params)

        filter = args.pop("filter", None)

        q_query = mapper.get("query")(filter) if filter else None

        limit, offset = rm.get_pagination(args)

        sort_column, sort_order = rm.get_sort(args)
        if not sort_column:
            sort_column = mapper.get("default_sort_column")
            sort_order = mapper.get("default_sort_order", "asc")

        format = args.pop("format", "json")

        selected_fields = args.pop("fields", None)
        if selected_fields:
            selected_fields = rm.parse_selected_fields(
                selected_fields, mapper.get("selectable_fields")
            )

        if model == "organisms":
            if organisms_sample_location_geo:
                items = organism_queryset_for_map_filters(params)
            else:
                items = organism_queryset_catalog_only(params)
        else:
            query, q_query = create_query(args, q_query)

            items = mapper.get("model").objects(**query)

            if q_query:
                items = items.filter(q_query)

        if sort_column and sort_order:
            sort = "-" + sort_column if sort_order == "desc" else sort_column
            # Taxons: secondary taxid tiebreaker so skip/limit stays stable when many
            # rows share the same organisms_count (otherwise pages overlap and drop taxa).
            if model == "taxons":
                items = items.order_by(sort, "taxid")
            else:
                items = items.order_by(sort)

        if selected_fields:
            items = items.only(*selected_fields)

        # Avoid queryset result cache when streaming (tsv/jsonl); as_pymongo() is already lazy
        if format in ("tsv", "jsonl"):
            items = items.no_cache()

        fields = selected_fields if selected_fields else mapper.get("tsv_fields")
        return rm.generate_response(format, fields, items, limit, offset)

    except Exception as e:
        raise BadRequest(description=f"{e}")


def get_related_items(
    queryset,
    immutable_dict,
    fields,
    allowed_fields=None,
    default_sort_column=None,
    default_sort_order="asc",
    max_limit=None,
):
    from helpers import resource_mixins as rm

    if max_limit is None:
        max_limit = rm.MAX_LIMIT

    args = dict(**immutable_dict)
    limit, offset = rm.get_pagination(args, max_limit=max_limit)
    sort_column, sort_order = rm.get_sort(args)
    sort_column = sort_column or default_sort_column
    sort_order = sort_order or default_sort_order
    output_format = args.pop("format", "json")
    selected_fields = args.pop("fields", None)
    selected_fields = (
        rm.parse_selected_fields(selected_fields, allowed_fields) if selected_fields else None
    )

    if sort_column:
        sort = "-" + sort_column if sort_order == "desc" else sort_column
        queryset = queryset.order_by(sort)

    if selected_fields:
        queryset = queryset.only(*selected_fields)

    if output_format in ("tsv", "jsonl"):
        queryset = queryset.no_cache()

    response_fields = selected_fields if selected_fields else fields
    return rm.generate_response(output_format, response_fields, queryset, limit, offset)


def create_query(args, q_query):
    query = {}

    for key, value in args.items():
        # Skip keys with empty values
        if not value:
            continue

        if value == "false":
            value = False

        if value == "true":
            value = True

        if value == "No Entry" or ("__exists" in key and value is False):
            value = None

        if "." in key:
            key = key.replace(".", "__")

        # Reference genome filter: portal sends `reference_genome`; Mongo may store
        # `reference genome` (space) or mixed casing from NCBI.
        if key == "metadata__assembly_info__refseq_category":
            norm = str(value).strip().lower().replace(" ", "_")
            if norm == "reference_genome":
                query["metadata__assembly_info__refseq_category__in"] = [
                    "reference_genome",
                    "reference genome",
                    "Reference genome",
                    "Reference Genome",
                ]
                continue

        # Handle greater than/less than conditions
        if any(op in key for op in ["__gte", "__lte", "__gt", "__lt", "__size"]):
            q_query = add_range_filter(key, value, q_query)

        # handle potential lists
        elif "__in" in key:
            if isinstance(value, str):
                result = [
                    None if part.strip() == "No Entry" else part.strip()
                    for part in value.split(",")
                ]
            elif isinstance(value, list):
                result = value
            else:
                result = [value]
            query[key] = result
        else:
            query[key] = value

    return query, q_query


def add_range_filter(key, value, q_query):
    """Add range filtering to the query (e.g., __gte and __lte), and attempt to convert the value to a number or date."""
    if validate_number(value):
        value = float(value.replace(",", ".")) if "." in value or "," in value else int(value)
    query_visitor = {f"{key}": value}
    if q_query:
        return Q(**query_visitor) & q_query
    return Q(**query_visitor)


def update_lineage(obj, organism, skip_sync=False):
    """
    Denormalize taxon_lineage from organism onto obj (QuerySet.update — no post_save).

    When skip_sync is False (default), refresh organism counters and TaxonNode aggregates
    via ``helpers.rest_catalog_sync.sync_species_after_catalog_change``. Set skip_sync=True
    when a caller will batch refresh later to avoid duplicate work.
    """
    lineage = organism.taxon_lineage
    obj.update(taxon_lineage=lineage)
    if skip_sync:
        return

    sync_species_after_catalog_change(str(organism.taxid), organism.taxon_lineage)


def validate_number(number):
    try:
        float(number)
        return True
    except ValueError:
        return False


def create_batches(items, batch_size=5000):
    return [items[i : i + batch_size] for i in range(0, len(items), batch_size)]
