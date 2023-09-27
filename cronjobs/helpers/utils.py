import json
from subprocess import check_output

def split_list_into_chunks(lst, chunk_size):
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

#bulk insert
def insert_data(model, data):
    return model.objects.insert(data)


def get_data_from_ncbi_datasets(cmd):
    output = check_output(cmd)
    return json.loads(output)

def get_objects_by_scalar_id(model,id_field,query=None):
    if query:
        return model.objects(**query).scalar(id_field)
    else:
        return model.objects().scalar(id_field)

def get_objects_by_query(model, query):
    return model.objects(**query)

def get_new_objects(model, id_field, query_key, objects):
    query = dict().setdefault(query_key,objects)
    existing_objects = get_objects_by_scalar_id(model, id_field, query)
    return [new_object for new_object in objects if not new_object in existing_objects]