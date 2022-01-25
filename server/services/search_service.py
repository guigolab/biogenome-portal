from enum import Enum
from flask import json
from flask import current_app as app
from mongoengine.queryset.visitor import Q
from db.models import TaxonNode

class SearchParams(Enum):
  SORT = "sortOrder"
  SORTCOLUMN = "sortColumn"
  FROM = "from"
  SIZE = "size"
  FILTER = "filter"
  TAX_NAME = "taxName"

class QueryParams(Enum):
  LIMIT = "limit"
  OFFSET = "offset"
  SORT = "sortOrder"
  SORTCOLUMN = "sortColumn"
  TAX_NAME = "taxName"

##when filter is present we trigger FTS
def full_text_search(params,model):
    json_resp = {}
    from_param = params.get(SearchParams.FROM.value) if params.get(SearchParams.FROM.value) else 0
    size_param = params.get(SearchParams.SIZE.value) if params.get(SearchParams.SIZE.value) else 20
    tax_name = params.get(SearchParams.TAX_NAME.value)
    filter = params.get(SearchParams.FILTER.value)
    sort_column = params.get(SearchParams.SORTCOLUMN.value)
    query_tax = ''
    organisms = model.objects()
    if tax_name:
        tax_node = TaxonNode.objects(name=tax_name).first()
        # organisms = model.objects(raw_lineage=tax_name)
        organisms = model.objects(taxon_lineage=tax_node)
        query_tax = Q(taxon_lineage=tax_node)
    app.logger.info(filter.isnumeric())
    if filter.isnumeric():
        query = query_by_taxid(filter)
    else:
        query = query_by_name(filter)
    if query_tax:
        organisms = model.objects(query & query_tax)
    else:
        organisms = model.objects(query)
    if sort_column:
        sort = '-'+sort_column if params.get(SearchParams.SORT.value) == 'true' else sort_column
        organisms = organisms.order_by(sort)
    json_resp['total'] = organisms.count()
    json_resp['data'] = json.loads(organisms[int(from_param):int(from_param)+int(size_param)].to_json())
    return json.dumps(json_resp)



def query_by_name(filter):
    return (Q(organism__iexact=filter) | Q(organism__icontains=filter))

def query_by_taxid(filter):
    return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
##filter is not present
def default_query_params(params,model):
    app.logger.info(params)
    organisms = model.objects()
    json_resp = {}
    offset =  params.get(QueryParams.OFFSET.value) if params.get(QueryParams.OFFSET.value) else 0
    limit = params.get(QueryParams.LIMIT.value) if params.get(QueryParams.LIMIT.value) else 20
    if [param.value in params.keys() for param in QueryParams]:
        if params.get(SearchParams.TAX_NAME.value):
            organisms = organisms(taxon_lineage=TaxonNode.objects(name = params.get(SearchParams.TAX_NAME.value)).first())
        if params.get(QueryParams.SORTCOLUMN.value):
            sort = '-' if params.get(QueryParams.SORT.value) == 'true' else '+'
            organisms = organisms.order_by(sort+params.get(QueryParams.SORTCOLUMN.value))
    json_resp['total'] = organisms.count()
    json_resp['data'] = json.loads(organisms[int(offset):int(limit)+int(offset)].to_json())
    return json.dumps(json_resp)
