import json

##fetch and load into dict
def fetch_lazy_reference(id_list):
    return [json.loads(lazy_ref.fetch().to_json()) for lazy_ref in id_list]