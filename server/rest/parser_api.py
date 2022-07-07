from flask import Response,request
from flask_restful import Resource
from services import parser_service
from flask import current_app as app
import json
from flask_jwt_extended import jwt_required


# class ExcelParserApi(Resource):
# ## should save excel file to track history
#     @jwt_required()
#     def post(self):
#         try:
#             files = request.files
#             payload = common_functions.request_parser(request)
#             app.logger.info(payload)
#             if 'excelFile' in files.keys():
#                 header_index = int(payload['headerIndex']) if 'headerIndex' in payload.keys() else 1
#                 import_option= payload['importOption'] if 'importOption' in payload.keys() and payload['importOption'] in IMPORT_OPTIONS else 'SKIP'
#                 sheet_obj, header, header_index = parser_service.parse_excel(BytesIO(files['excelFile'].read()),header_index)
#                 #first validate
#                 errors = parser_helper.validator_helper(sheet_obj, header_index, header)
#                 if len(errors.keys())>0:
#                     return custom_response(errors, 400)
#                 #then parse
#                 samples = parser_helper.sample_parser_helper(sheet_obj, header_index, header)
#                 #and manage import options
#                 new_samples, updated_ids = parser_helper.manage_existing_samples(samples,import_option)
#                 app.logger.info(updated_ids)
#                 response=dict()
#                 if new_samples:
#                     saved_samples = submission_service.import_samples(new_samples)
#                     new_ids = [sample.tube_or_well_id for sample in saved_samples]
#                     response['saved'] = new_ids
#                 if updated_ids:
#                     response['updated'] = updated_ids
#                     response = dict(updated=updated_ids)
#                 if response.keys():
#                     return Response(json.dumps(response), mimetype="application/json", status=200)
#                 else:
#                     return Response('no new sample is present in the excel sheet', mimetype="application/json", status=304)
#             else:
#                 raise SchemaValidationError
#         except Exception as e:
#             app.logger.error(e)
#         raise InternalServerError

#     @jwt_required()
#     def get(self):
#         return Response(parser_service.create_excel(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")


class ExcelParser(Resource):
## should save excel file to track history
    def post(self):
        excel = request.files.get('excel')
        form_data = dict(**request.files,**request.json) if request.is_json else dict(**request.form)
        form_data['excel'] = excel
        messages, status = parser_service.parse_excel(**form_data)
        app.logger.info(messages)
        return Response(json.dumps(messages),mimetype="application/json", status=status)


    @jwt_required()
    def get(self):
        return Response(parser_service.create_excel(), content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

