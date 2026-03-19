import csv
import json
from io import StringIO
from bson.json_util import dumps, JSONOptions, DatetimeRepresentation
from mongoengine.queryset.visitor import Q
from celery.result import AsyncResult
from werkzeug.exceptions import BadRequest
from db import models
from helpers.taxon_organism_sync import sync_organism_status_and_taxon_counts
from . import query_visitors

MODEL_MAPPER = {
    'annotations':{
        'model': models.GenomeAnnotation,
        'query': query_visitors.annotation_query,
        'tsv_fields': ['name', 'scientific_name', 'taxid', 'assembly_accession'],
        'default_sort_column': 'name',
        'default_sort_order': 'asc',
    },
    'assemblies':{
        'model': models.Assembly,
        'query': query_visitors.assembly_query,
        'tsv_fields': ['accession','assembly_name','scientific_name', 'taxid'],
        'default_sort_column': 'accession',
        'default_sort_order': 'asc',
    },
    'biosamples':{
        'model': models.BioSample,
        'query': query_visitors.biosample_query,
        'tsv_fields': ['accession', 'scientific_name', 'taxid'],
        'default_sort_column': 'accession',
        'default_sort_order': 'asc',
    },
    'submitted_biosamples':{
        'model': models.BioSampleSubmission,
        'query': query_visitors.biosample_submission_query,
        'tsv_fields': ['accession', 'name', 'taxid', 'scientific_name', 'user'],
        'default_sort_column': 'accession',
        'default_sort_order': 'asc',
    },
    'reads':{
        'model': models.ReadRun,
        'query': query_visitors.read_run_query,
        'tsv_fields': [
            'run_accession',
            'experiment_accession',
            'sample_accession',
            'taxid',
            'scientific_name',
        ],
        'default_sort_column': 'run_accession',
        'default_sort_order': 'asc',
    },
    'local_samples':{
        'model': models.LocalSample,
        'query': query_visitors.local_sample_query,
        'tsv_fields': ['local_id', 'scientific_name', 'taxid'],
        'default_sort_column': 'local_id',
        'default_sort_order': 'asc',
    },
    'organisms':{
        'model': models.Organism,
        'query': query_visitors.organism_query,
        'tsv_fields': ['scientific_name', 'taxid', "insdc_common_name"],
        'default_sort_column': 'taxid',
        'default_sort_order': 'asc',
    },
    'taxons':{
        'model': models.TaxonNode,
        'query': query_visitors.taxon_query,
        'tsv_fields':  ['taxid', 'name', 'rank'],
        'default_sort_column': 'taxid',
        'default_sort_order': 'asc',
    },
        'sub_projects':{
        'model': models.SubProject,
        'query': query_visitors.sub_project_query,
        'tsv_fields':  ['taxid', 'name', 'rank'],
        'default_sort_column': 'name',
        'default_sort_order': 'asc',
    }

}

# Keys allowed for GET /api/<catalog_model> and POST /api/<catalog_model>/query.
# Excludes JWT-gated collections that use different URL paths or custom handlers.
CATALOG_MODEL_KEYS = frozenset(MODEL_MAPPER.keys()) - frozenset(
    {'sub_projects', 'submitted_biosamples'}
)

DEFAULT_LIMIT = 10
DEFAULT_OFFSET = 0
MAX_LIMIT = 200

def dump_json(response_dict):
    json_options = JSONOptions()
    json_options.datetime_representation = DatetimeRepresentation.ISO8601
    return dumps(response_dict, indent=4, sort_keys=True, json_options=json_options)

def _tsv_row_from_item(item, fields):
    """Build a single TSV row (list of values) from an item and field names."""
    new_row = []
    for k in fields:
        if 'metadata.' in k:
            value = get_nested_value(item, k)
        else:
            value = item.get(k)
        if isinstance(value, list):
            value = ','.join(map(str, value))
        new_row.append(value)
    return new_row


def create_tsv(items, fields):
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter='\t')
    tsv.writerow(fields)
    for item in items:
        tsv.writerow(_tsv_row_from_item(item, fields))
    return writer_file.getvalue()


def stream_tsv(items_iterable, fields, buffer_size=2000):
    """Yield TSV content in chunks: header first, then buffer_size rows per chunk."""
    buf = StringIO()
    tsv = csv.writer(buf, delimiter='\t')
    tsv.writerow(fields)
    yield buf.getvalue().encode('utf-8')
    buf.close()

    batch = []
    for item in items_iterable:
        batch.append(_tsv_row_from_item(item, fields))
        if len(batch) >= buffer_size:
            buf = StringIO()
            tsv = csv.writer(buf, delimiter='\t')
            tsv.writerows(batch)
            yield buf.getvalue().encode('utf-8')
            buf.close()
            batch = []
    if batch:
        buf = StringIO()
        tsv = csv.writer(buf, delimiter='\t')
        tsv.writerows(batch)
        yield buf.getvalue().encode('utf-8')

def _safe_int(value, field_name):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise BadRequest(description=f"{field_name} must be an integer")


def get_pagination(args, default_limit=DEFAULT_LIMIT, default_offset=DEFAULT_OFFSET, max_limit=MAX_LIMIT):
    limit = _safe_int(args.pop('limit', default_limit), 'limit')
    offset = _safe_int(args.pop('offset', default_offset), 'offset')
    if limit < 1:
        raise BadRequest(description="limit must be >= 1")
    if offset < 0:
        raise BadRequest(description="offset must be >= 0")
    return min(limit, max_limit), offset

def get_sort(args):
    return args.pop('sort_column', None), args.pop('sort_order', 'desc')

def get_items(model, immutable_dict):
    try:
        mapper = MODEL_MAPPER.get(model)

        args = dict(**immutable_dict)
        
        filter = args.pop('filter', None)

        q_query = mapper.get('query')(filter) if filter else None

        limit, offset = get_pagination(args)

        sort_column, sort_order = get_sort(args)
        if not sort_column:
            sort_column = mapper.get('default_sort_column')
            sort_order = mapper.get('default_sort_order', 'asc')
        
        format = args.pop('format', 'json')
        
        selected_fields = args.pop('fields', None)
        if selected_fields:
            selected_fields = parse_selected_fields(selected_fields, mapper.get('selectable_fields'))
        
        query, q_query = create_query(args, q_query)

        items = mapper.get('model').objects(**query)

        if q_query:
            items = items.filter(q_query)

        if sort_column and sort_order:
            sort = '-' + sort_column if sort_order == 'desc' else sort_column
            items = items.order_by(sort)

        if selected_fields:
            items = items.only(*selected_fields)

        # Avoid queryset result cache when streaming (tsv/jsonl); as_pymongo() is already lazy
        if format in ('tsv', 'jsonl'):
            items = items.no_cache()

        fields = selected_fields if selected_fields else mapper.get('tsv_fields')
        return generate_response(format, fields, items, limit, offset)

    except Exception as e:
        raise BadRequest(description=f"{e}")

def generate_response(format, fields, items, limit=20, offset=0):
    if format == 'tsv':
        return stream_tsv(items.as_pymongo(), fields, buffer_size=2000), "text/tab-separated-values"
    elif format == 'jsonl':
        return generate_jsonlines(items.as_pymongo()), "application/jsonlines"
    return generate_json(items, limit, offset)

def generate_json(items, limit=20, offset=0):
    total = items.count()
    response = dict(total=total, data=list(items.skip(offset).limit(limit).as_pymongo()))
    return dump_json(response), "application/json"

def generate_jsonlines(pymongo_data):
    for item in pymongo_data:
        yield dump_json(item) + "\n"


def parse_selected_fields(selected_fields, allowed_fields=None):
    fields = [field.strip() for field in selected_fields.split(',') if field.strip()]
    if not fields:
        return None
    if not allowed_fields:
        return fields
    invalid = [field for field in fields if field not in allowed_fields]
    if invalid:
        raise BadRequest(description=f"Unsupported fields requested: {', '.join(invalid)}")
    return fields


def get_related_items(
    queryset,
    immutable_dict,
    fields,
    allowed_fields=None,
    default_sort_column=None,
    default_sort_order='asc',
    max_limit=MAX_LIMIT,
):
    args = dict(**immutable_dict)
    limit, offset = get_pagination(args, max_limit=max_limit)
    sort_column, sort_order = get_sort(args)
    sort_column = sort_column or default_sort_column
    sort_order = sort_order or default_sort_order
    output_format = args.pop('format', 'json')
    selected_fields = args.pop('fields', None)
    selected_fields = (
        parse_selected_fields(selected_fields, allowed_fields) if selected_fields else None
    )

    if sort_column:
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        queryset = queryset.order_by(sort)

    if selected_fields:
        queryset = queryset.only(*selected_fields)

    if output_format in ('tsv', 'jsonl'):
        queryset = queryset.no_cache()

    response_fields = selected_fields if selected_fields else fields
    return generate_response(output_format, response_fields, queryset, limit, offset)

def create_query(args, q_query):
    query = {}

    for key, value in args.items():
        # Skip keys with empty values
        if not value:
            continue
        
        if value == 'false':
            value = False

        if value == 'true':
            value = True

        if value == 'No Entry' or ( '__exists' in key and value == False):
            value = None

        if 'metadata.' in key:
            key = key.replace('.', '__')

        # Handle greater than/less than conditions
        if any(op in key for op in ['__gte', '__lte', '__gt', '__lt', '__size']):
            q_query = add_range_filter(key, value, q_query)

        #handle potential lists
        elif '__in' in key:
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
    # Attempt to convert value to a number (int or float)

    if validate_number(value):
        value = float(value.replace(',', '.')) if '.' in value or ',' in value else int(value)
    # Create the filter for the query
    query_visitor = {f"{key}": value}
    if q_query:
        return Q(**query_visitor) & q_query
    return Q(**query_visitor)

def get_nested_value(dictionary, keys):
    keys_list = keys.split('.')
    value = dictionary
    try:
        for key in keys_list:
            value = value[key]
        return value
    except (KeyError, TypeError):
        return " "
    
def update_lineage(obj, organism, skip_sync=False):
    """
    Denormalize taxon_lineage from organism onto obj (QuerySet.update — no post_save).

    When skip_sync is False (default), refresh organism status and TaxonNode counts.
    Set skip_sync=True after a document .save() that already ran related post_save sync
    for the same mutation, to avoid duplicate work.
    """
    lineage = organism.taxon_lineage
    obj.update(taxon_lineage=lineage)
    if skip_sync:
        return

    sync_organism_status_and_taxon_counts(organism.taxid, list(lineage) if lineage else None)

    
def validate_number(number):
    try:
        float(number)
        return True
    except ValueError:
        return False   
    

def _celery_app_for_async_result():
    """Bind AsyncResult to the Flask Celery app when in app context."""
    try:
        from flask import current_app, has_app_context

        if has_app_context():
            app = current_app.extensions.get("celery")
            if app is not None:
                return app
    except RuntimeError:
        pass
    try:
        from celery import current_app as celery_current

        return celery_current
    except Exception:
        return None


def _json_safe_result(value):
    """Return a value that json.dumps can handle (for API responses)."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, BaseException):
        return {"type": value.__class__.__name__, "message": str(value)}
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            try:
                json.dumps(v)
                out[str(k)] = v
            except (TypeError, ValueError):
                out[str(k)] = str(v)
        return out
    if isinstance(value, (list, tuple)):
        return [_json_safe_result(x) for x in value]
    return str(value)


def get_task_status(task_id):
    """
    Celery task state for GET /api/tasks/<task_id> (polling).

    Note: unknown or expired ids often appear as PENDING with ready() False until the
    backend evicts them — clients should treat long-lived PENDING as unknown/failed.
    """
    if task_id is None or not str(task_id).strip():
        raise BadRequest(description="task_id is required")

    app = _celery_app_for_async_result()
    task = AsyncResult(str(task_id).strip(), app=app) if app is not None else AsyncResult(str(task_id).strip())

    state = task.state
    payload = {
        "task_id": str(task_id).strip(),
        "state": state,
        "ready": task.ready(),
        "successful": task.successful() if task.ready() else None,
    }

    if task.ready():
        if task.successful():
            payload["result"] = _json_safe_result(task.result)
        elif task.failed():
            payload["failed"] = True
            payload["successful"] = False
            payload["error"] = _json_safe_result(task.result)
            payload["traceback"] = task.traceback
        else:
            payload["result"] = _json_safe_result(task.result)
    else:
        payload["result"] = None
        if state == "PENDING":
            payload["hint"] = (
                "Still waiting for a worker or unknown task id; keep polling with backoff."
            )

    return payload


def create_batches(items, batch_size=5000):
    return [items[i:i+batch_size] for i in range(0, len(items), batch_size)]


