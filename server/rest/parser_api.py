from flask import Response,request
from flask_restful import Resource
from utils.constants import CHECKLIST_FIELD_GROUPS
from utils.utils import custom_response
from services import submission_service,parser_service
from errors import InternalServerError,SchemaValidationError
from flask import current_app as app
import json
from flask_jwt_extended import jwt_required
from io import BytesIO


class ExcelParserApi(Resource):

    @jwt_required()
    def post(self):
        try:
            files = request.files
            if 'excelFile' in files.keys():
                samples_from_excel = parser_service.parse_excel(BytesIO(files['excelFile'].read()))
                fields = parser_service.get_checklist_fields(CHECKLIST_FIELD_GROUPS)
                samples_with_errors = parser_service.validate_samples(samples_from_excel, fields)
                if len(samples_with_errors) > 0:
                    return custom_response(samples_with_errors, 400)
                else:
                    app.logger.info('INSIDE ELSE')
                    parsed_samples = parser_service.parse_samples(samples_from_excel,fields)
                    saved_samples = submission_service.import_samples(parsed_samples)
                return Response(json.dumps([sample.sample_unique_name for sample in saved_samples]), mimetype="application/json", status=200)
            else:
                raise SchemaValidationError
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError

