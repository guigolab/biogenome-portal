from flask_restful import Resource
from flask import Response, request
from . import bioprojects_service 
from db.models import BioProject
from errors import NotFound
import json

class BioProjectsApi(Resource):
    def get(self):
        total, data = bioprojects_service.get_bioprojects(**request.args)
        json_resp = dict(total=total, data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp),mimetype="application/json", status=200)

class BioProjectApi(Resource):
    def get(self, accession):
        bioproject = BioProject.objects(accession=accession).first()
        if not bioproject:
            raise NotFound
        return Response(bioproject.to_json(), mimetype="application/json", status=200)