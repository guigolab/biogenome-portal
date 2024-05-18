import os
from jobs import assemblies, biosamples, experiments, geolocation, taxonomy
from db.models import CronJob
from errors import NotFound

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
    cronjob = CronJob.objects(cronjob_type=model).first()
    if cronjob:
        raise RecordAlreadyExistError
    cronjob = CronJob(cronjob_type=model, status= CronJobStatus.PENDING).save()
    print(f'Triggering job {model}')
    code = 200
    message = ''
    try:
        JOB_MAP[model]()
        message = f'job {model} successfully executed'
    except Exception as e:
        message = f'Error executing job {model}: {e}'
        code = 400
        print("ERROR: ")
        print(message)
    finally:
        cronjob.delete()

def get_cronjobs():
    cronjobs = CronJob.objects()
    return cronjobs

def get_cronjob(model):
    cron = CronJob.objects(cronjob_type=model).exclude()
    if not cron:
        raise NotFound

def delete_cronjob(model):
    cron = get_cronjob(model)
    cron.delete()
    return f"Cron {model} succesfully deleted", 201