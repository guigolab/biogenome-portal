from flask_restful import Resource
from flask import Response
from db.models import CronJob
from db.enums import CronJobStatus
from flask_jwt_extended import jwt_required
from errors import NotFound, RecordAlreadyExistError
from . import cronjob_service


JOB_MAP = {
    'get_biosamples_derived_from': cronjob_service.get_biosamples_derived_from,
    'get_biosamples_parents':cronjob_service.get_biosample_parents,
    'get_experiments': cronjob_service.get_experiments,
    'import_assemblies': cronjob_service.import_assemblies,
    'update_countries': cronjob_service.update_countries,
    'import_biosamples': cronjob_service.import_biosamples,
    'update_sample_locations': cronjob_service.update_sample_locations,
    'get_samples_collection_date':cronjob_service.get_samples_collection_date,
    'add_blob_link':cronjob_service.add_blob_link
}
## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        cronjob = CronJob.objects().to_json()
        return Response(cronjob, mimetype="application/json", status=200)

    #create cronjob
    @jwt_required()
    def post(self, model):
        if not model in JOB_MAP.keys():
            raise NotFound
        cronjob = CronJob.objects(cronjob_type=model).first()
        if cronjob:
            raise RecordAlreadyExistError
        cronjob = CronJob(cronjob_type=model, status= CronJobStatus.PENDING).save()
        resp = cronjob.to_json()
        print(f'Triggering job {model}')
        JOB_MAP[model]()
        cronjob.delete()
        return Response(resp, mimetype="application/json", status=201)

    @jwt_required()
    def delete(self, model):
        cron = CronJob.onjects(cronjob_type=model)
        if not cron:
            raise NotFound
        cron.delete()
