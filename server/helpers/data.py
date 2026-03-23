from mongoengine.queryset.visitor import Q
from werkzeug.exceptions import BadRequest
from db.model import (
    Assembly,
    BioSample,
    BioSampleSubmission,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)
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


def get_items(model, immutable_dict):
    from helpers import resource_mixins as rm

    try:
        mapper = MODEL_MAPPER.get(model)

        args = dict(**immutable_dict)

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

        query, q_query = create_query(args, q_query)

        items = mapper.get("model").objects(**query)

        if q_query:
            items = items.filter(q_query)

        if sort_column and sort_order:
            sort = "-" + sort_column if sort_order == "desc" else sort_column
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

        if "metadata." in key:
            key = key.replace(".", "__")

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
