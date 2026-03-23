from flask import Response, request
from flask_restful import Resource
from services import goat_reports
from flask_jwt_extended import jwt_required
from wrappers.data_manager import data_manager_required
import json


class GoaTReportApi(Resource):
    def get(self):
        tsv_goat_report, file_name = goat_reports.download_goat_report()
        return Response(tsv_goat_report, mimetype="text/tab-separated-values", headers={"Content-disposition": f"attachment; filename={file_name}"})

    @jwt_required()
    @data_manager_required()
    def post(self):
        messages, status = goat_reports.upload_goat_report(request.files)
        return Response(json.dumps(messages), mimetype="application/json", status=status)

