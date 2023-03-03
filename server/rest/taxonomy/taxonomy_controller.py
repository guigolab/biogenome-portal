from . import taxonomy_service
from flask import Response,request
from flask_restful import Resource
import json
import os

class TreeApi(Resource):
    def get(self, taxid):
        #TODO ADD LEVEL CONTROL ON TREE
        tree = taxonomy_service.create_tree(taxid, **request.args)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        tree = taxonomy_service.generate_tree(data)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

class TaxonomyTreeApi(Resource):
    def get(self,taxid):
        tree = taxonomy_service.create_tree(taxid, **request.args)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

class TreeStatusApi(Resource):
    def get(self,taxid):
        tree = taxonomy_service.generate_status_tree(taxid, status='Assemblies Submitted')
        return Response(json.dumps(tree), mimetype="application/json", status=200)

class TreeLevelsApi(Resource):
    def get(self,taxid=None):
        if not taxid:
            taxid = os.getenv('ROOT_NODE')
        levels = taxonomy_service.get_levels(taxid)
        return Response(json.dumps(levels), mimetype="application/json", status=200)
