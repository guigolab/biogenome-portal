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
            if 'excelFile' in files.keys():
                samples, errors = parser_service.parse_excel(BytesIO(files['excelFile'].read()))
                if len(errors) > 0:
                    return custom_response(errors, 400)
                else:
                    app.logger.info(len(samples))
                    app.logger.info('INSIDE ELSE')
                    saved_samples = submission_service.import_samples(samples)
                return Response(json.dumps([sample.sample_unique_name for sample in saved_samples]), mimetype="application/json", status=200)
            else:
                raise SchemaValidationError
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError

