from lxml import etree
import requests
from . import ncbi_client
from mongoengine.errors import ValidationError
import csv
from io import StringIO
from bson.json_util import dumps, JSONOptions, DatetimeRepresentation
from ..organism import organisms_utils
from ..user import user_utils
from mongoengine.queryset.visitor import Q


def save_document(document):
    try:
        document.save()
        return document, 200
    except ValidationError as e:
        return e.to_dict(), 400


def get_annotations(org_name):
    response = requests.get(f'https://genome.crg.cat/geneid-predictions/api/organisms/{org_name}')
    if response.status_code != 200:
        return
    return response.json()    

def parse_taxon_from_ena(xml):
    root = etree.fromstring(xml)
    organism = root[0].attrib
    lineage = []
    for taxon in root[0]:
        if taxon.tag == 'lineage':
            for node in taxon:
                lineage.append(node.attrib)
    lineage.insert(0,organism)
    return lineage

## expect biosample model from ebi biosamples
def parse_sample_metadata(metadata):
    sample_metadata = dict()
    for k in metadata.keys():
        sample_metadata[k] = metadata[k][0]['text']
    return sample_metadata


def validate_taxonomy(user, existing_organisms, taxids):

    existing_taxids = [org.taxid for org in existing_organisms]
    #CHECK USER PERMISSION
    if not user:
        return [{'user':'User not found'}], None
    
    taxonomy_errors = check_species_permission(user, existing_taxids)

    if taxonomy_errors:
        return taxonomy_errors, None
    
    new_taxids = [taxid for taxid in taxids if taxid not in existing_taxids]

    new_taxons_to_parse = []

    if new_taxids:
    
        new_taxons_to_parse.extend( ncbi_client.get_taxons(new_taxids))

        if not new_taxons_to_parse:
            taxonomy_errors.append({'taxonomy': f"No taxid has been found for {','.join(new_taxids)}"})
            return taxonomy_errors, None
        
        insdc_new_taxids = [str(t_to_parse.get('taxonomy').get('tax_id')) for t_to_parse in new_taxons_to_parse]

        for n_taxid in new_taxids:
            if not new_taxons_to_parse:
                taxonomy_errors.append({n_taxid: f"{n_taxid} not found in INSDC"})
            if not n_taxid in insdc_new_taxids:
                taxonomy_errors.append({n_taxid: f"{n_taxid} not found in INSDC"})
        
    return taxonomy_errors, new_taxons_to_parse


def check_species_permission(user, existing_taxids):
    taxonomy_errors = []
    if user.role.value == 'Admin':
        return taxonomy_errors
    for ex_taxid in existing_taxids:
        if ex_taxid not in user.species:
            taxonomy_errors.append({'taxonomy':f"The organism {ex_taxid} already exists in the db and you don't have the rights to modify it!"})
    return taxonomy_errors

# def create_assembly_related_data(ncbi_response):
#     ##get or create organism
#     ##get or create biosample

# def create_biosample_related_data():
#     ##get or create organism

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
                field = k.split('.')[1]
                value = item.get('metadata').get(field)
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
            taxids = organisms_utils.get_organisms_taxid_from_parent_taxid(v)
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
            taxids = user_utils.get_species_by_user_name(v)
            if query.get('taxid__in'):
                query['taxid__in'].extend(taxids)
            else:
                query['taxid__in'] = taxids
        elif "__gte" in k or "__lte" in k:
            query_visitor = {f"metadata__{k}":v}
            q_query = Q(**query_visitor) & q_query if q_query else Q(**query_visitor)

        elif k in ("limit", "offset", "sort_order", "sort_column", "filter", "format", "fields[]"):
            continue
        else:
            query[f"metadata__{k}"] = v
    return query, q_query