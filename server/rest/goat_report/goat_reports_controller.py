from flask import Response, request
from flask_restful import Resource
from . import goat_reports_service
import os
# #CRUD operations on sample

class GoaTReportApi(Resource):

    #download goat_report
    def get(self):
        goat_report = goat_reports_service.download_goat_report()
        if 'download' in request.args.keys() and request.args['download']:
            project_name = os.getenv('PROJECT_NAME')
            file_name = f"{project_name}_species_goat.tsv"
            return Response(goat_report, mimetype="text/tsv", headers={"Content-disposition": f"attachment; filename={file_name}"})
        else:
            return Response(goat_report, mimetype="text/tsv") 


