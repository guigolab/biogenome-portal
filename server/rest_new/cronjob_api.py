from flask_restful import Resource
from flask import Response
from db.models import CronJob,CronJobStatus
from flask_jwt_extended import jwt_required
import json

## persist cronjob status
class CronJobApi(Resource):

    def get(self):
        cronjob = CronJob.objects().to_json()
        return Response(cronjob, mimetype="application/json", status=200)

    #create cronjob
    @jwt_required()
    def post(self):
        cronjob = CronJob(status=CronJobStatus.PENDING).save()
        return Response(cronjob.to_json(), mimetype="application/json", status=201)

    @jwt_required()
    def delete(self):
        cronjob = CronJob.objects().first()
        if cronjob:
            cronjob.delete()
            resp = dict(message="cronjob deleted")
            return Response(json.dumps(resp), mimetype="application/json", status=200)
