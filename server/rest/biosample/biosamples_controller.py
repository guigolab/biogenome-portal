from flask_restful import Resource
from flask import Response, request
import json
from db.models import BioSample
from . import biosamples_service
from errors import NotFound
from flask_jwt_extended import jwt_required
from ..utils import data_helper


FIELDS_TO_EXCLUDE = ['id','created','last_check']


class BioSampleApi(Resource):
    def get(self, accession):
        biosample_obj=BioSample.objects(accession=accession).exclude('id').first()
        if not biosample_obj:
            raise NotFound
        return Response(biosample_obj.to_json(),mimetype="application/json", status=200)

    @jwt_required()
    def post(self,accession):
        response = biosamples_service.create_biosample_from_accession(accession)
        return Response(json.dumps(response['message']), mimetype="application/json", status=response['status'])

    @jwt_required()
    def delete(self,accession):
        deleted_accession = biosamples_service.delete_biosample(accession)
        if deleted_accession:
            return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class BioSamplesApi(Resource):

    def get(self):
        # data_helper.update_samples_coordinates(BioSample.objects())
        # data_helper.coordinates_in_country(BioSample)
        total, data = biosamples_service.get_biosamples(**request.args)
        json_resp = dict(total=total,data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)
