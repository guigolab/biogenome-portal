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
    return args.get('sort_column'), args.get('sort_order', None)

def get_items(args, model, fieldToExclude, q_query, tsvFields):
    mimetype = "application/json"

    ##parse args
    format = args.get('format', 'json')

    limit, offset = get_pagination(args)     
    sort_column, sort_order = get_sort(args)
    query, q_query =create_query(args, q_query)
    
    items = model.objects(**query).exclude(*fieldToExclude)

    if q_query:
        items = items.filter(q_query)

    if sort_column and sort_order:
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        items = items.order_by(sort)

    total = items.count()
    if format == 'tsv':
        tsv_report = create_tsv(items.as_pymongo(), tsvFields).encode('utf-8')
        mimetype="text/tab-separated-values"
        return tsv_report, mimetype, 200

    response = dict(total=total, data=list(items.skip(offset).limit(limit).as_pymongo()))
    return dump_json(response), mimetype, 200

def create_query(args, q_query):
    query = {}

    for key, value in args.items():
        # Skip keys with empty values
        if not value or key in {"limit", "offset", "sort_order", "sort_column", "filter", "format", "fields[]"}:
            continue
        
        if value == 'No Value' or ( '__exists' in key and value == 'false'):
            value = None

        if 'metadata.' in key:
            key = key.replace('.', '__')

        if key == "user":
            query = handle_user_query(query, value)

        # Handle greater than/less than conditions
        elif "__gte" in key or "__lte" in key:
            q_query = add_range_filter(key, value, q_query)

        # Ignore control keys like pagination, sorting, etc.
        elif key not in {"limit", "offset", "sort_order", "sort_column", "filter", "format", "fields[]"}:
            query[key] = value

    return query, q_query

def handle_user_query(query, username):
    """Handle query logic for the 'user' field."""
    taxids = user.get_species_by_user_name(username)
    if 'taxid__in' in query:
        query['taxid__in'].extend(taxids)
    else:
        query['taxid__in'] = taxids
    return query


def add_range_filter(key, value, q_query):
    """Add range filtering to the query (e.g., __gte and __lte)."""
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
        return None
    
def update_lineage(obj, organism):
    lineage = organism.taxon_lineage
    obj.update(taxon_lineage=lineage)