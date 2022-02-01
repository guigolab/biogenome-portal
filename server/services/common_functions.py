
##fetch and load into dict
def fetch_lazy_reference(id_list,model):
    return model.objects(id__in=id_list)
    # return [json.loads(lazy_ref.as_pymongo()) for lazy_ref in id_list]

def resolve_params(allowed_params, **params):
  # add default params if not present
  for k,v in params.items():
    if k in allowed_params.keys():
        allowed_params[k] = v
  return allowed_params
    