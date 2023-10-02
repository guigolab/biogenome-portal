from flask import Response
from flask_restful import Resource
from . import goat_reports_service
import os
# #CRUD operations on sample

PROJECT_ACCESSION = os.getenv('PROJECT_ACCESSION')

class GoaTReportApi(Resource):

    #download goat_report
    def get(self):
        tsv_goat_report = goat_reports_service.download_goat_report()
        mimetype="text/tab-separated-values"
        encode='utf-8'            
        file_name = f"{PROJECT_ACCESSION}_species_goat.tsv"
        return Response(tsv_goat_report.encode(encode), mimetype=mimetype, headers={"Content-disposition": f"attachment; filename={file_name}"})


