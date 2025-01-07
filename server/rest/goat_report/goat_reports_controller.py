from flask import Response,request
from flask_restful import Resource
from . import goat_reports_service
from helpers import data as data_helper
from flask_jwt_extended import jwt_required
import json

from wrappers.data_manager import data_manager_required

class GoaTReportApi(Resource):
    def get(self):
        tsv_goat_report, file_name = goat_reports_service.download_goat_report()
        return Response(tsv_goat_report, mimetype="text/tab-separated-values", headers={"Content-disposition": f"attachment; filename={file_name}"})

    @jwt_required()
    @data_manager_required()
    def post(self):
        messages, status = goat_reports_service.upload_goat_report(request.files)
        return Response(json.dumps(messages), mimetype="application/json", status=status)
    
class GoaTReportUploadApi(Resource):
    def get(self, task_id):
        response = data_helper.get_task_status(task_id)
        return Response(json.dumps(response), mimetype="application/json", status=200)
        