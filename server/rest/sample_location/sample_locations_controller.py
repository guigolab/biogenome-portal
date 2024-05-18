from flask import Response
from flask_restful import Resource
from utils.extensions.cache import cache
from . import sample_locations_service

class SampleLocationsByTaxon(Resource):
    @cache.memoize(timeout=300)
    def get(self,taxid):
        sample_coordinates = sample_locations_service.get_sample_locations_by_taxon(taxid)
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

class SampleLocationsByOrganism(Resource):
    @cache.memoize(timeout=300)
    def get(self, taxid):
        sample_coordinates = sample_locations_service.get_sample_locations_by_organism(taxid)
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

class SampleLocationsByBioSample(Resource):
    @cache.memoize(timeout=300)
    def get(self, accession):
        sample_coordinates = sample_locations_service.get_sample_locations_by_biosample(accession)
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

        
class SampleLocationsByLocalSample(Resource):
    @cache.memoize(timeout=300)
    def get(self, local_id):
        sample_coordinates = sample_locations_service.get_sample_locations_by_localsample(local_id)
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

