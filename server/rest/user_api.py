from urllib import response
from flask_restful import Resource
from flask import Response, request
import json
from db.models import BioGenomeUser
from services import user
from utils import common_functions
from flask_jwt_extended import jwt_required

FIELDS_TO_EXCLUDE = ['id','password']

##post request to handle large list of assemblies/experiments/local_samples/biosamples/annotations ids
class UserApi(Resource):

    @jwt_required()
    def get(self):
        return Response(common_functions.query_search(BioGenomeUser,FIELDS_TO_EXCLUDE,**request.args), mimetype="application/json", status=200)

    ##create user
    @jwt_required()
    def post(self):
        data = request.json if request.is_json else request.form
        response = user.create_user(data)
        return Response(json.dumps(response), mimetype="application/json", status=201)
    
    @jwt_required()
    def put(self,name):
        data = request.json if request.is_json else request.form
        response = user.update_user(name,data)

    @jwt_required()
    def delete(self,name):
        response = user.delete_user(name)
        # deleted_accession = reads.delete_experiment(accession)
        # if deleted_accession:
        #     return Response(json.dumps(deleted_accession), mimetype="application/json", status=201)
