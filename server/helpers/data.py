import csv
from io import StringIO
from bson.json_util import dumps, JSONOptions, DatetimeRepresentation
from helpers import organism, user
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
                value = get_nested_value(item.get('metadata'), k)
            else:
                value = item.get(k)
            new_row.append(value)
        tsv.writerow(new_row)
    return writer_file.getvalue()

def get_pagination(args):
    return int(args.get('limit', 10)),  int(args.get('offset', 0))

def get_sort(args):
    return args.get('sort_column'), args.get('sort_order', 'desc')

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

    if sort_column:
        sort = '-' + sort_column if sort_order == 'desc' else sort_column
        items = items.order_by(sort)

    total = items.count()
    if format == 'tsv':
        assemblies = create_tsv(items.as_pymongo(), tsvFields).encode('utf-8')
        mimetype="text/tab-separated-values"
        return assemblies, mimetype, 200

    response = dict(total=total, data=list(items.skip(offset).limit(limit).as_pymongo()))
    return dump_json(response), mimetype, 200

def create_query(args, q_query):
    query={}
    
    for k, v in args.items():

        if not v:
            continue

        if k == "parent_taxon":
            taxids = organism.get_organisms_taxid_from_parent_taxid(v)
            if query.get('taxid__in'):
                query['taxid__in'].extend(taxids)
            else:
                query['taxid__in'] = taxids

        elif k == "blobtoolkit":
            
            if v.lower() == 'true':
                query['blobtoolkit_id__exists'] = True
        elif k in ["goat_status", "countries", "insdc_status", "target_list_status"]:
           query[k] = v
        elif k == "user":
            taxids = user.get_species_by_user_name(v)
            if query.get('taxid__in'):
                query['taxid__in'].extend(taxids)
            else:
                query['taxid__in'] = taxids
        elif "__gte" in k or "__lte" in k:
            query_visitor = {f"metadata__{k.replace('.', '__')}":v}
            q_query = Q(**query_visitor) & q_query if q_query else Q(**query_visitor)

        elif k in ("limit", "offset", "sort_order", "sort_column", "filter", "format", "fields[]"):
            continue
        else:
            query[f"metadata__{k.replace('.', '__')}"] = v
    return query, q_query

def get_nested_value(dictionary, keys):
    keys_list = keys.split('.')
    value = dictionary
    try:
        for key in keys_list:
            value = value[key]
        return value
    except (KeyError, TypeError):
        return None