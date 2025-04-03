import os
from jobs import assemblies, biosamples, experiments, geolocation, taxonomy
from werkzeug.exceptions import BadRequest, NotFound

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'


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
        'blob_link':assemblies.add_blob_link,
        'accessions_import': assemblies.import_assemblies_from_accessions,
        'link_chromosomes': assemblies.link_chromosomes
    },
    'helpers':{
        'handle_orphans':taxonomy.handle_orphan_organisms,
        'add_lineage':taxonomy.add_lineage,
        'tree': taxonomy.compute_tree
    },
    'geo_locations':{
        'create_from_local_samples':geolocation.create_local_sample_coordinates,
        'create_from_biosamples':geolocation.create_biosample_coordinates,
        'create_countries':geolocation.update_all_countries
    }
}

def get_task(model, action):
    task = JOB_MODELS.get(model).get(action)
    if not task:
        raise NotFound(description=f"Action {action} of model {model} not found")
    return task

def create_cronjob(model, action):
    
    task = get_task(model, action)
    try:
        active_tasks = task.app.control.inspect().active()
        
        if active_tasks:
            for v in active_tasks.values():
                for t in v:
                    if t.get('name') == f"{model}_{action}":
                        raise BadRequest(description=f"A job for {model}_{action} is already running")

        print(f'Triggering job {model}_{action}')

        result = task.delay()
        return f'job {result.id} of model {model} {action} successfully launched'
    
    except Exception as e:
        message = f'Error executing job {model}{action}: {e}'
        print("ERROR: ", message)
        raise BadRequest(description=message)

def get_cronjobs():
    active_tasks = biosamples.import_biosamples_from_project_names.app.control.inspect().active()
    response = []
    for v in active_tasks.values():
        for t in v:
            response.append(t)
    return response


