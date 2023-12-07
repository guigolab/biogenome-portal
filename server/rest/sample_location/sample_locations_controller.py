from flask import Response
from db.models import Organism,SampleCoordinates,BioSample,LocalSample
from flask_restful import Resource
from errors import NotFound

class SampleLocationsByTaxon(Resource):
    def get(self,taxid):
        related_organisms_by_taxid = Organism.objects(taxon_lineage=taxid).scalar('taxid')
        if not related_organisms_by_taxid:
            raise NotFound
        sample_coordinates = SampleCoordinates.objects(taxid__in=related_organisms_by_taxid).exclude('id')
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

class SampleLocationsByOrganism(Resource):
    def get(self, taxid):
        #check if organism exists
        if not Organism.objects(taxid=taxid).first():
            raise NotFound
        sample_coordinates = SampleCoordinates.objects(taxid=taxid)
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

class SampleLocationsByBioSample(Resource):
    def get(self, accession):
        #check if organism exists
        if not BioSample.objects(accession=accession).first():
            raise NotFound
        sample_coordinates = SampleCoordinates.objects(sample_accession=accession).first()
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

class SampleLocationsByLocalSample(Resource):
    def get(self, local_id):
        #check if organism exists
        if not LocalSample.objects(local_id=local_id).first():
            raise NotFound
        sample_coordinates = SampleCoordinates.objects(sample_accession=local_id).first()
        return Response(sample_coordinates.to_json(),mimetype="application/json", status=200)

