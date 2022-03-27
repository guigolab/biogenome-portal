
def resolve_params(allowed_params, **params):
  # add default params if not present
  for k,v in params.items():
    if k in allowed_params.keys():
        allowed_params[k] = v
  return allowed_params
    
#parse payload for post requests
def request_parser(request): 
  if request.is_json:
    return request.json
  else:
    return request.form