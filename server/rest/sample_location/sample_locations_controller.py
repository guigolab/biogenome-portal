from flask import Response,request
from flask_restful import Resource
from . import sample_locations_service
import json


class SampleLocations(Resource):
    def get(self):
        resp = sample_locations_service.get_sample_locations(**request.args)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class SampleLocationsByTaxon(Resource):
    def get(self,taxid):
        resp = sample_locations_service.get_sample_locations_by_taxon(taxid)
        return Response(resp,mimetype="application/json", status=200)

class SampleLocationsByOrganism(Resource):
    def get(self, taxid):
        return Response(sample_locations_service.get_sample_locations_by_organism(taxid),
                        mimetype="application/json", 
                        status=200)

class SampleLocationsByBioSample(Resource):
    def get(self, accession):
        return Response(sample_locations_service.get_sample_locations_by_biosample(accession),
                        mimetype="application/json", 
                        status=200)

        
class SampleLocationsByLocalSample(Resource):
    def get(self, local_id):
        return Response(sample_locations_service.get_sample_locations_by_localsample(local_id),
                        mimetype="application/json", 
                        status=200)

