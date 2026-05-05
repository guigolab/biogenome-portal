from flask import Response
from flask_restful import Resource

from services import goat_reports


class GoaTReportApi(Resource):
    def get(self):
        tsv_goat_report, file_name = goat_reports.download_goat_report()
        return Response(
            tsv_goat_report,
            mimetype="text/tab-separated-values",
            headers={"Content-disposition": f"attachment; filename={file_name}"},
        )
