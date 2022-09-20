from db.models import Assembly,Annotation,Experiment,BioSample,LocalSample
from mongoengine.queryset.visitor import Q
import json


def get_query_set(model,filter):
  if model == Assembly:
    return (Q(accession__iexact=filter) | Q(accession__icontains=filter) | Q(assembly_name__icontains=filter) | Q(assembly_name__iexact=filter) | Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
  elif model == Annotation:
    return (Q(name__iexact=filter) | Q(name__icontains=filter))
  elif model == Experiment:
    return (Q(experiment_accession__iexact=filter) | Q(experiment_accession__icontains=filter))
  elif model == BioSample:
    return (Q(accession__iexact=filter) | Q(accession__icontains=filter) | Q(scientific_name__icontains=filter))
  elif model == LocalSample:
    return (Q(local_id__iexact=filter) | Q(local_id__icontains=filter) | Q(scientific_name__icontains=filter))

def resolve_params(allowed_params, **params):
  # add default params if not present
  for k,v in params.items():
    if k in allowed_params.keys():
        allowed_params[k] = v
  return allowed_params
    
#parse requests payload
def request_parser(request): 
  if request.is_json:
    return request.json
  else:
    return request.form

def biosamples_response_parser(biosample_response):
  if not biosample_response or not '_embedded' in biosample_response.keys():
    return
  return biosample_response['_embedded']['samples']

def query_search(model,fields_to_exclude, offset=0, limit=20, filter=None):
  if filter:
    query_filter = get_query_set(model,filter)
    items =  model.objects(query_filter).exclude(*fields_to_exclude)
  else:
    items = model.objects().exclude(*fields_to_exclude)
  json_resp = dict()
  json_resp['total'] = items.count()
  json_resp['data'] = list(items[int(offset):int(offset)+int(limit)].as_pymongo())
  return json.dumps(json_resp, default=str)

