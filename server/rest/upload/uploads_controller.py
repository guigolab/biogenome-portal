from flask import Response,request
from flask_restful import Resource
from . import uploads_service
import json
from flask_jwt_extended import jwt_required

class ExcelParserApi(Resource):
## should save excel file to track history
    
    def get(self, task_id):
        response = uploads_service.get_task_status(task_id)
        return Response(json.dumps(response), mimetype="application/json", status=200)
        
    @jwt_required()
    def post(self, task_id=None):
        excel = request.files.get('excel')
        form_data = dict(**request.files,**request.json) if request.is_json else dict(**request.form)
        form_data['excel'] = excel
        messages, status = uploads_service.parse_excel(**form_data)
        return Response(json.dumps(messages), mimetype="application/json", status=status)


