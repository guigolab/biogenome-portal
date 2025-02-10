import csv
from io import StringIO
from bson.json_util import dumps, JSONOptions, DatetimeRepresentation
from mongoengine.queryset.visitor import Q
from celery.result import AsyncResult
from werkzeug.exceptions import NotFound, BadRequest
from db import models
from . import query_visitors

MODEL_MAPPER = {
    'annotations':{
        'model': models.GenomeAnnotation,
        'query': query_visitors.annotation_query,
        'tsv_fields': ['name', 'scientific_name', 'taxid', 'assembly_accession']
    },
    'assemblies':{
        'model': models.Assembly,
        'query': query_visitors.assembly_query,
        'tsv_fields': ['accession','assembly_name','scientific_name', 'taxid']
    },
    'biosamples':{
        'model': models.BioSample,
        'query': query_visitors.biosample_query,
        'tsv_fields': ['accession', 'scientific_name', 'taxid']
    },
    'experiments':{
        'model': models.Experiment,
        'query': query_visitors.experiment_query,
        'tsv_fields': ['experiment_accession', 'taxid', "scientific_name", "sample_accession"]
    },
    'local_samples':{
        'model': models.LocalSample,
        'query': query_visitors.local_sample_query,
        'tsv_fields': ['local_id', 'scientific_name', 'taxid']
    },
    'organisms':{
        'model': models.Organism,
        'query': query_visitors.organism_query,
        'tsv_fields': ['scientific_name', 'taxid', "insdc_common_name"]
    },
    'taxons':{
        'model': models.TaxonNode,
        'query': query_visitors.taxon_query,
        'tsv_fields':  ['taxid', 'name', 'rank']
    },
        'sub_projects':{
        'model': models.SubProject,
        'query': query_visitors.sub_project_query,
        'tsv_fields':  ['taxid', 'name', 'rank']
    }

}

def dump_json(response_dict):
    json_options = JSONOptions()
    json_options.datetime_representation = DatetimeRepresentation.ISO8601
    return dumps(response_dict, indent=4, sort_keys=True, json_options=json_options)

def create_tsv(items, fields):
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter='\t')
    tsv.writerow(fields)
    for item in items:
        new_row = []
        for k in fields:
            if 'metadata.' in k:
                value = get_nested_value(item, k)
            else:
                value = item.get(k)
            new_row.append(value)
        tsv.writerow(new_row)
    return writer_file.getvalue()

def get_pagination(args):
    return int(args.pop('limit', 10)),  int(args.pop('offset', 0))

def get_sort(args):
    return args.pop('sort_column', None), args.pop('sort_order', None)

def get_items(model, immutable_dict):
    try:
        mapper = MODEL_MAPPER.get(model)

        args = dict(**immutable_dict)
        
        filter = args.pop('filter', None)

        q_query = mapper.get('query')(filter) if filter else None

        limit, offset = get_pagination(args)     

        sort_column, sort_order = get_sort(args)
        
        format = args.pop('format', 'json')
        
        selected_fields = args.pop('fields', None)
        
        query, q_query = create_query(args, q_query)

        items = mapper.get('model').objects(**query)

        if q_query:
            items = items.filter(q_query)

        if sort_column and sort_order:
            sort = '-' + sort_column if sort_order == 'desc' else sort_column
            items = items.order_by(sort)

        if selected_fields:
            selected_fields = selected_fields.split(',')
            items = items.only(*selected_fields)

        fields = selected_fields if selected_fields else mapper.get('tsv_fields')
        return generate_response(format, fields, items, limit, offset)

    except Exception as e:
        raise BadRequest(description=f"{e}")

def generate_response(format, fields, items, limit, offset):
    if format == 'tsv':
        return create_tsv(items.as_pymongo(), fields).encode('utf-8'), "text/tab-separated-values"
    elif format == 'jsonl':
        return generate_jsonlines(items.as_pymongo()), "application/jsonlines"
    total = items.count()
    response = dict(total=total, data=list(items.skip(offset).limit(limit).as_pymongo()))
    return dump_json(response), "application/json"

def generate_jsonlines(pymongo_data):
    for item in pymongo_data:
        yield dump_json(item) + "\n"

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
    
def update_lineage(obj, organism):
    lineage = organism.taxon_lineage
    obj.update(taxon_lineage=lineage)

    
def validate_number(number):
    try:
        float(number)
        return True
    except ValueError:
        return False   
    

def get_task_status(task_id):
    task = AsyncResult(task_id)
    print(task)

    if task.result:
        return dict(messages=task.result.get('messages'), state=task.state )
    raise NotFound(description=f"{task_id} not found")