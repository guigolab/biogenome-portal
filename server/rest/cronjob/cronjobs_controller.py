from flask_restful import Resource
from flask import Response
from db.models import CronJob
from db.enums import CronJobStatus
from flask_jwt_extended import jwt_required
from errors import NotFound, RecordAlreadyExistError
from . import cronjob_service
from ..utils import wrappers

JOB_MAP = {
    'get_biosamples_derived_from': cronjob_service.get_biosamples_derived_from,
    'get_biosamples_parents':cronjob_service.get_biosample_parents,
    'get_experiments': cronjob_service.get_experiments,
    'import_assemblies': cronjob_service.import_assemblies,
    'update_countries': cronjob_service.update_countries,
    'import_biosamples': cronjob_service.import_biosamples,
    'update_sample_locations': cronjob_service.update_sample_locations,
    'get_samples_collection_date':cronjob_service.get_samples_collection_date,
    'add_blob_link':cronjob_service.add_blob_link,
    'remove_orphan_local_samples':cronjob_service.remove_orphan_local_samples,
    'create_biosample_coordinates':cronjob_service.create_biosample_coordinates,
    'create_local_sample_coordinates':cronjob_service.create_local_sample_coordinates,
    'fix_experiments_biosample_attribute':cronjob_service.fix_experiments_biosample_attribute,
    'fix_experiments_metadata':cronjob_service.fix_experiments_metadata,
    'compute_tree':cronjob_service.compute_tree
}
## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        cronjob = CronJob.objects().to_json()
        return Response(cronjob, mimetype="application/json", status=200)

    @jwt_required()
    @wrappers.admin_required()
    def post(self, model):
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

        return Response(message, mimetype="application/json", status=code)

    @jwt_required()
    @wrappers.admin_required()
    def delete(self, model):
        cron = CronJob.objects(cronjob_type=model)
        if not cron:
            raise NotFound
        cron.delete()
