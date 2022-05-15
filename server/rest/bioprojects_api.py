from flask_restful import Resource
from flask import Response, request
from errors import SchemaValidationError
from db.models import BioProject
from flask import current_app as app
import os
from mongoengine.queryset.visitor import Q


ROOT_BIOPROJECT= os.getenv('PROJECT_ACCESSION')
##post request to handle large list of assemblie/experiment ids
class BioProjectApi(Resource):
    def get(self):
        root_pr = BioProject.objects(accession=ROOT_BIOPROJECT).first()
        return Response(BioProject.objects(Q(parents=root_pr) | Q(accession=ROOT_BIOPROJECT)).to_json(),mimetype="application/json", status=200)

        # if request.is_json and 'ids' in request.json.keys(): 
        #     ids = request.json['ids']
        # elif request.form and 'ids' in request.form.keys():
        #     ids = request.form
        # else:
        #     raise SchemaValidationError
        # return Response(get_data(model,ids), mimetype="application/json", status=201)
