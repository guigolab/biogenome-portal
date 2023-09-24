from flask import Response, request
from flask_restful import Resource
from . import goat_reports_service
import os
# #CRUD operations on sample

class GoaTReportApi(Resource):

    #download goat_report
    def get(self):
        goat_report, download = goat_reports_service.download_goat_report(**request.args)
        if download:   
            project_name = os.getenv('PROJECT_ACCESSION')
            file_name = f"{project_name}_species_goat.tsv"
            return Response(goat_report, mimetype="text/tsv", headers={"Content-disposition": f"attachment; filename={file_name}"})
        else:
            return Response(goat_report, mimetype="text/tsv") 


