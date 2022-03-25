from flask import Response,request
from flask_restful import Resource
from utils.utils import custom_response
from services import submission_service,parser_service, parser_helper
from errors import InternalServerError,SchemaValidationError
from flask import current_app as app
import json
from flask_jwt_extended import jwt_required
from io import BytesIO
from utils.constants import IMPORT_OPTIONS


class ExcelParserApi(Resource):
## should save excel file to track history
    @jwt_required()
    def post(self):
        try:
            files = request.files
            opts = request.args
            if 'excelFile' in files.keys():
                header_index = int(opts['headerIndex']) if 'headerIndex' in opts.keys() else 1
                import_option= opts['importOption'] if 'importOption' in opts.keys() and opts['importOption'] in IMPORT_OPTIONS else 'SKIP'
                sheet_obj, header, header_index = parser_service.parse_excel(BytesIO(files['excelFile'].read()),header_index)
                #first validate
                app.logger.info('HERE1')

                errors = parser_helper.validator_helper(sheet_obj, header_index, header)
                if len(errors.keys())>0:
                    return custom_response(errors, 400)
                #then parse
                samples = parser_helper.sample_parser_helper(sheet_obj, header_index, header)
                #and manage import options
                app.logger.info('HERE2')
                new_samples = parser_helper.manage_existing_samples(samples,import_option)
                if len(new_samples)>0:
                    saved_samples = submission_service.import_samples(new_samples)
                    return Response(json.dumps([sample.tube_or_well_id for sample in saved_samples]), mimetype="application/json", status=200)
                else:
                    Response('no new sample is present in the excel sheet', mimetype="application/json", status=200)
            else:
                raise SchemaValidationError
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError

    @jwt_required()
    def get(self):
        return Response(parser_service.create_excel(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

