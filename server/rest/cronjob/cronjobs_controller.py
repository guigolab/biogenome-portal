from flask_restful import Resource
from flask import Response
from db.models import CronJob
from db.enums import CronJobStatus
from flask_jwt_extended import jwt_required
from errors import NotFound, RecordAlreadyExistError
from . import cronjob_service

CRONJOB_TYPES = ['update_reads', 'update_samples', 'import_assemblies', 'update_countries', 'import_biosamples', 'update_locations']

## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        CronJob.objects().delete()
        cronjob = CronJob.objects().to_json()
        return Response(cronjob, mimetype="application/json", status=200)

    #create cronjob
    @jwt_required()
    def post(self, model):
        if not model in CRONJOB_TYPES:
            raise NotFound
        cronjob = CronJob.objects(cronjob_type=model).first()
        if cronjob:
            raise RecordAlreadyExistError
        cronjob = CronJob(cronjob_type=model, status= CronJobStatus.PENDING).save()
        # try:
        if model == 'update_samples':
            cronjob_service.update_samples()
        elif model == 'update_reads':
            cronjob_service.update_reads()
        elif model == 'import_assemblies':
            cronjob_service.import_assemblies()
        elif model == 'update_countries':
            cronjob_service.update_countries()
        elif model == 'import_biosamples':
            cronjob_service.import_biosamples()
        elif model == 'update_locations':
            cronjob_service.update_organism_locations()
        # except:
        #     print(f' Error in {cronjob.cronjob_type}')
        # finally:
        #     cronjob.delete()
        return Response(cronjob.to_json(), mimetype="application/json", status=201)

