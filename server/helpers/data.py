import csv
from io import StringIO
from bson.json_util import dumps, JSONOptions, DatetimeRepresentation
from helpers import user
from mongoengine.queryset.visitor import Q


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
    return int(args.get('limit', 10)),  int(args.get('offset', 0))

def get_sort(args):
    return args.get('sort_column'), args.get('sort_order')

def get_items(args, db_model, q_query, default_tsv_fields):

    limit, offset = get_pagination(args)     

    sort_column, sort_order = get_sort(args)
    
    query, q_query = create_query(args, q_query)
    
    print(query)

    format = args.get('format', 'json')

    selected_fields = [v for k, v in args.items(multi=True) if k.startswith('fields[]')]

    items = db_model.objects(**query)

    if q_query:
        items = items.filter(q_query)

    if sort_column and sort_order:
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        items = items.order_by(sort)

    if selected_fields:
        items = items.only(*selected_fields)

    total = items.count()

    if format == 'tsv':
        fields = selected_fields if selected_fields else default_tsv_fields
        return create_tsv(items.as_pymongo(), fields).encode('utf-8'), "text/tab-separated-values", 200

    response = dict(total=total, data=list(items.skip(offset).limit(limit).as_pymongo()))
    return dump_json(response), "application/json", 200

def create_query(args, q_query):
    query = {}

    ignored_keys = {"limit", "offset", "sort_order", "sort_column", "filter", "format", "fields[]"}

    for key, value in args.items():
        # Skip keys with empty values
        if not value or key in ignored_keys:
            continue
        
        if value == 'false':
            value = False

        if value == 'true':
            value = True

        if value == 'No Value' or ( '__exists' in key and value == 'false'):
            value = None

        if 'metadata.' in key:
            key = key.replace('.', '__')

        # Handle greater than/less than conditions
        if any(op in key for op in ['__gte', '__lte', '__gt', '__lt']):
            q_query = add_range_filter(key, value, q_query)

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
    

