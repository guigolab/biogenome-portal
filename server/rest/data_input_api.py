from flask import request
from flask import current_app as app
from db.models import Organism, TaxonNode,SecondaryOrganism,Assembly,Experiment
from flask_restful import Resource
import services.taxon_service as service
from errors import InternalServerError
from flask import Response, request
import xml.etree.ElementTree as ET

class InputDataApi(Resource):
    def get(self, value):
        submission_file = service.create_submission_xml(value)
        return Response(ET.tostring(submission_file), mimetype='application/xml', status=200)
    
    def post(self):
        try:
            data = request.get_json()
            sample_xml = service.create_xml(data)
            return Response(ET.tostring(sample_xml), mimetype='application/xml', status=200)
        except Exception as e:
            app.logger.error(e)
        raise InternalServerError

    def delete(self):
        TaxonNode.drop_collection()
        SecondaryOrganism.drop_collection()
        Organism.drop_collection()
        Assembly.drop_collection()
        Experiment.drop_collection()
        return 200