from flask_restful import Resource
from flask import Response
from db.models import CronJob
from db.enums import CronJobStatus
from flask_jwt_extended import jwt_required
from errors import NotFound, RecordAlreadyExistError
from . import cronjob_service

CRONJOB_TYPES = ['update_reads', 'update_samples', 'import_assemblies', 'update_countries', 'import_biosamples']

## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        cronjob = CronJob.objects().to_json()
        return Response(cronjob, mimetype="application/json", status=200)

    #create cronjob
    @jwt_required()
    def post(self, model):
        print(model)
        if not model in CRONJOB_TYPES:
            raise NotFound
        cronjob = CronJob.objects(cronjob_type=model).first()
        if cronjob:
            raise RecordAlreadyExistError
        cronjob = CronJob(cronjob_type=model, status= CronJobStatus.PENDING).save()
        if model == 'update_samples':
            cronjob_service.update_samples(cronjob)
        elif model == 'update_reads':
            cronjob_service.update_reads(cronjob)
        elif model == 'import_assemblies':
            cronjob_service.import_assemblies(cronjob)
        elif model == 'update_countries':
            cronjob_service.update_countries(cronjob)
        elif model == 'import_biosamples':
            cronjob_service.import_biosamples(cronjob)
        return Response(cronjob.to_json(), mimetype="application/json", status=201)

