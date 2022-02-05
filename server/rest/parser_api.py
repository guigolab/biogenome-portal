from flask import Response,request
from flask_restful import Resource
import services.parser_service as service
from errors import InternalServerError
from flask import current_app as app
import json
from io import BytesIO
from db.models import Organism, TaxonNode,SecondaryOrganism
import xml.etree.ElementTree as ET

ACCESSION = 'ERC000053' ##set to env variable
URL = f'https://www.ebi.ac.uk/ena/browser/api/xml/{ACCESSION}?download=false'

class ExcelParserApi(Resource):
    def get(self):
        groups = service.checklist_parser(URL)
        return Response(json.dumps(groups),mimetype="application/json", status=200)

    def post(self):
        try:
            files = request.files
            if 'excelFile' in files.keys():
                excel = BytesIO(files['excelFile'].read())
                samples = service.parse_excel(excel)
                return Response(json.dumps(samples), mimetype="application/json", status=200)
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError


class XMLParserApi(Resource):
    def get(self, value):
        submission_file = service.create_submission_xml(value)
        return Response(ET.tostring(submission_file), mimetype='application/xml', status=200)
    
    def post(self):
        try:
            data = request.get_json()
            app.logger.info(data)
            sample_xml = service.create_xml(data)
            return Response(ET.tostring(sample_xml), mimetype='application/xml', status=200)
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError

    def delete(self):
        TaxonNode.drop_collection()
        SecondaryOrganism.drop_collection()
        Organism.drop_collection()