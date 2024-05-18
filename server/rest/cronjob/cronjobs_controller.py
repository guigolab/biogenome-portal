from flask_restful import Resource
from flask import Response
from db.models import CronJob
from db.enums import CronJobStatus
from flask_jwt_extended import jwt_required
from errors import NotFound, RecordAlreadyExistError
from . import cronjob_service
from wrappers.admin import admin_required


## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        cronjobs = cronjob_service.get_cronjobs()
        return Response(cronjobs.to_json(), mimetype="application/json", status=200)

    @jwt_required()
    @admin_required()
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
    @admin_required()
    def delete(self, model):
        message, status = cronjob_service.delete_cronjob(model)
        return Response(message, mimetype="application/json", status=status)
