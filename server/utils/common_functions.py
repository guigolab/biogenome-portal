
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
  if not biosample_response and not 'embedded' in biosample_response.keys():
    return
  return biosample_response['_embedded']['samples']

def query_search(model,fields_to_exclude,query_filter=None):
  if query_filter:
    return model.objects(query_filter).exclude(*fields_to_exclude)
  return model.objects().exclude(*fields_to_exclude)

def get_model_objects(model, query):
  return model.objects(**query)
