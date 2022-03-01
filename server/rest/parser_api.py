from flask import Response,request
from flask_restful import Resource
from utils.utils import custom_response
from services import submission_service,parser_service
from errors import InternalServerError,SchemaValidationError
from flask import current_app as app
import json
from flask_jwt_extended import jwt_required
from io import BytesIO


class ExcelParserApi(Resource):
## should save excel file to track history
    @jwt_required()
    def post(self):
        try:
            files = request.files
            opts = request.args
            if 'excelFile' in files.keys():
                samples, errors = parser_service.parse_excel(BytesIO(files['excelFile'].read()),opts)
                if len(errors) > 0:
                    return custom_response(errors, 400)
                else:
                    saved_samples = submission_service.import_samples(samples)
                return Response(json.dumps([sample.tube_or_well_id for sample in saved_samples]), mimetype="application/json", status=200)
            else:
                raise SchemaValidationError
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError

    @jwt_required()
    def get(self):
        return Response(parser_service.create_excel(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

