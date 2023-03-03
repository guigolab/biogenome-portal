from flask import Response,request
from flask_restful import Resource
from . import uploads_service
from flask import current_app as app
import json
from flask_jwt_extended import jwt_required

class ExcelParserApi(Resource):
## should save excel file to track history
    # @jwt_required()
    def post(self):
        excel = request.files.get('excel')
        form_data = dict(**request.files,**request.json) if request.is_json else dict(**request.form)
        form_data['excel'] = excel
        messages, status = uploads_service.parse_excel(**form_data)
        return Response(json.dumps(messages), mimetype="application/json", status=status)


    # @jwt_required()
    # def get(self):
    #     return Response(parser_service.create_excel(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

