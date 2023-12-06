from flask import Response,request
from flask_restful import Resource
from . import goat_reports_service
import os
from flask_jwt_extended import jwt_required
import json

PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

class GoaTReportApi(Resource):

    #download goat_report
    def get(self):
        tsv_goat_report = goat_reports_service.download_goat_report()
        mimetype="text/tab-separated-values"
        encode='utf-8'            
        file_name = f"{PROJECT_ACCESSION}_species_goat.tsv"
        return Response(tsv_goat_report.encode(encode), mimetype=mimetype, headers={"Content-disposition": f"attachment; filename={file_name}"})

    @jwt_required()
    def post(self):
        goat_report = request.files.get('goat_report')
        saved_species, errors = goat_reports_service.upload_goat_report(goat_report)
        response = dict(saved_species=saved_species,errors=errors)
        return Response(json.dumps(response), mimetype="application/json", status=200)