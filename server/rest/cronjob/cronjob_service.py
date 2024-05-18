import os
from jobs import assemblies, biosamples, experiments, geolocation, taxonomy
from errors import NotFound
# from extensions.celery import make_celery
# import app
# from extensions.celery import celery
# celery = make_celery(app)
from celery.result import AsyncResult

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'
ROOT_NODE = os.getenv('ROOT_NODE')

JOB_MAP = {
    'get_biosamples_derived_from': biosamples.get_biosamples_derived_from_parent,
    'get_biosamples_parents':biosamples.get_biosample_parents,
    'get_experiments': experiments.get_experiments_from_bioproject_accession,
    'import_assemblies': assemblies.import_assemblies_by_bioproject,
    'update_countries': geolocation.update_all_countries,
    'import_biosamples': biosamples.import_biosamples_from_project_names,
    'add_blob_link':assemblies.add_blob_link,
    'create_biosample_coordinates':geolocation.create_biosample_coordinates,
    'create_local_sample_coordinates':geolocation.create_local_sample_coordinates,
    'compute_tree':taxonomy.compute_tree
}

def create_cronjob(model):
    
    if not model in JOB_MAP.keys():
        raise NotFound

    print(f'Triggering job {model}')
    try:
        task = JOB_MAP[model]
        active_tasks = task.app.control.inspect().active()
        
        for v in active_tasks.values():
            for t in v:
                if t.get('name') == model:
                    return f"A job for {model} is already running", 400

        result = task.delay()
        message = f'job {result.id} of model {model} successfully executed'
        return message, 200
    
    except Exception as e:
        message = f'Error executing job {model}: {e}'
        print("ERROR: ", message)
        return message, 400

def get_cronjobs():
    active_tasks = get_current_active_tasks()
    response = []
    for v in active_tasks.values():
        for t in v:
            response.append(t)
    return response

def get_cronjob(model):
        
    if not model in JOB_MAP.keys():
        raise NotFound
    
    active_tasks = get_current_active_tasks()
    for v in active_tasks.values():
        for t in v:
            if t.get('name') == model:
                res = AsyncResult(t.get('id'))
                return str(res.result)

def get_current_active_tasks():
    task = JOB_MAP['import_assemblies']
    active_tasks = task.app.control.inspect().active()
    return active_tasks


def delete_cronjob(model):
    task = JOB_MAP[model]
    active_tasks = get_current_active_tasks()

    control = task.app.control
    for v in active_tasks.values():
        for t in v:
            if t.get('name') == model:
                id = t.get('id')
                control.revoke(id)

    return f"Cron {model} succesfully deleted", 201