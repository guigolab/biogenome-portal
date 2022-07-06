from flask_restful import Resource
from flask import Response, request
import json
from services import biosample_service
##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class BioSampleApi(Resource):

    def get(self):
        return Response(biosample_service.get_biosamples(**request.args), mimetype="application/json", status=200)

    def post(self,accession):
        new_assembly = assembly_service.create_assembly_from_accession(accession,track_data)
        if new_assembly:
            return Response(new_assembly.to_json(), mimetype="application/json", status=201)

    def delete(self,accession):
        deleted_accession = biosample_service.delete_biosample(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
