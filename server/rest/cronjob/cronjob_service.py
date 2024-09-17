import os
from jobs import assemblies, biosamples, experiments, geolocation, taxonomy
from errors import NotFound
from celery.result import AsyncResult

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'
ROOT_NODE = os.getenv('ROOT_NODE')


JOB_MODELS = {
    'biosamples':{
        'import':biosamples.import_biosamples_from_project_names,
        'derived_from':biosamples.get_biosamples_derived_from_parent,
        'parents':biosamples.get_biosample_parents
    },
    'experiments':{
        'import':experiments.get_experiments_from_bioproject_accession
    },
    'assemblies':{
        'import':assemblies.import_assemblies_by_bioproject,
        'blob_link':assemblies.add_blob_link
    },
    'helpers':{
        'handle_orphans':taxonomy.handle_orphan_organisms,
        'add_lineage':taxonomy.add_lineage
    },
    'geo_locations':{
        'create_from_local_samples':geolocation.create_local_sample_coordinates,
        'create_from_biosamples':geolocation.create_biosample_coordinates,
        'cr,eate_countries':geolocation.update_all_countries
    }
}

def create_cronjob(model, action):
    
    task = JOB_MODELS.get(model).get(action)
    if not task:
        raise NotFound
    try:
        active_tasks = task.app.control.inspect().active()
        
        if active_tasks:
            for v in active_tasks.values():
                for t in v:
                    if t.get('name') == f"{model}_{action}":
                        return f"A job for {model}_{action} is already running", 400

        print(f'Triggering job {model}_{action}')

        result = task.delay()
        message = f'job {result.id} of model {model} {action} successfully launched'
        return message, 200
    
    except Exception as e:
        message = f'Error executing job {model}{action}: {e}'
        print("ERROR: ", message)
        return message, 400

def get_cronjobs():
    active_tasks = get_current_active_tasks('biosamples','import')
    response = []
    for v in active_tasks.values():
        for t in v:
            response.append(t)
    return response

def get_cronjob(model, action):
    task = JOB_MODELS.get(model).get(action)
    if not task:
        raise NotFound
    active_tasks = get_current_active_tasks()
    for v in active_tasks.values():
        for t in v:
            if t.get('name') == model:
                res = AsyncResult(t.get('id'))
                return str(res.result)

def get_current_active_tasks(model,action):
    task = JOB_MODELS.get(model).get(action)
    active_tasks = task.app.control.inspect().active()
    return active_tasks


def delete_cronjob(model, action):
    task = JOB_MODELS.get(model).get(action)
    active_tasks = get_current_active_tasks()

    control = task.app.control
    for v in active_tasks.values():
        for t in v:
            if t.get('name') == model:
                id = t.get('id')
                control.revoke(id)

    return f"Cron {model} succesfully deleted", 201