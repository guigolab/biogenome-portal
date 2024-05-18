import os
from jobs import assemblies, biosamples, experiments, geolocation, taxonomy
from db.models import CronJob
from errors import NotFound, RecordAlreadyExistError
# from extensions.celery import make_celery
# import app
# from extensions.celery import celery
import celery.states as states
# celery = make_celery(app)
from celery.app.control import Control
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


# @celery.task(name=)
# def create_task(task_type):
#     time.sleep(int(task_type) * 10)
#     return True

def create_cronjob(model):
    
    if not model in JOB_MAP.keys():
        raise NotFound
    
    # control = celery.control

    # print(control.inspect().active())

    # result = celery.AsyncResult(task_name=model)

    # if result.state == states.PENDING:
    #     raise RecordAlreadyExistError

    print(f'Triggering job {model}')
    code = 200
    try:
        task = JOB_MAP[model].delay()
        message = f'job {task.id} of model {model} successfully executed'
        print(message)
        return message, code
    except Exception as e:
        message = f'Error executing job {model}: {e}'
        code = 400
        print("ERROR: ")
        print(message)
        return message, code

def get_cronjobs():
    cronjobs = CronJob.objects()
    return cronjobs

def get_cronjob(model):
    # res = CELERY.AsyncResult(task_name=model)
    return 'bla'# str(res.result)

def delete_cronjob(model):
    # control = Control(CELERY)
    # control.revoke(name=model, terminate=True)
    return f"Cron {model} succesfully deleted", 201