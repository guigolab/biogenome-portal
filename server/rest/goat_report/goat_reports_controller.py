from flask import Response,request
from flask_restful import Resource
from . import goat_reports_service
import os
from flask_jwt_extended import jwt_required
import json
from wrappers.data_manager import data_manager_required

GOAT_PROJECT_NAME = os.getenv('GOAT_PROJECT_NAME')

class GoaTReportApi(Resource):

    #download goat_report
    def get(self):
        tsv_goat_report = goat_reports_service.download_goat_report()
        mimetype="text/tab-separated-values"
        encode='utf-8'            
        file_name = f"{GOAT_PROJECT_NAME}_species_goat.tsv"
        return Response(tsv_goat_report.encode(encode), mimetype=mimetype, headers={"Content-disposition": f"attachment; filename={file_name}"})

    @jwt_required()
    @data_manager_required()
    def post(self):
        goat_report = request.files.get('goat_report')
        messages, status = goat_reports_service.upload_goat_report(goat_report)
        return Response(json.dumps(messages), mimetype="application/json", status=status)
    

class GoaTReportUploadApi(Resource):
    def get(self, task_id):
        response = goat_reports_service.get_task_status(task_id)
        return Response(json.dumps(response), mimetype="application/json", status=200)
        