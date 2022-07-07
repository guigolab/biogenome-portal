from flask_restful import Resource
from flask import Response, request
from db.models import BioProject
from services.bioproject import get_bioproject
from flask import current_app as app
import os
import json


ROOT_BIOPROJECT= os.getenv('PROJECT_ACCESSION')
##post request to handle large list of assemblie/experiment ids
class BioProjectApi(Resource):
    def get(self,accession=None):
        if accession:
            return Response(json.dumps(get_bioproject(accession)),mimetype="application/json", status=200)
        return Response(BioProject.objects().to_json(),mimetype="application/json", status=200)

        # if request.is_json and 'ids' in request.json.keys(): 
        #     ids = request.json['ids']
        # elif request.form and 'ids' in request.form.keys():
        #     ids = request.form
        # else:
        #     raise SchemaValidationError
        # return Response(get_data(model,ids), mimetype="application/json", status=201)
