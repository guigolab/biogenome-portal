from . import taxonomy_service
from flask import Response,request
from flask_restful import Resource
import json
from errors import NotFound

class TreeApi(Resource):
    def get(self, taxid):
        #TODO ADD LEVEL CONTROL ON TREE
        tree = taxonomy_service.create_tree(taxid, **request.args)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        tree = taxonomy_service.generate_tree(data)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

class RelativeTaxonomyTreeApi(Resource):
    def get(self,taxid):
        response = taxonomy_service.create_tree_from_relative_species(taxid, **request.args)
        if not response:
            raise NotFound
        return Response(json.dumps(response), mimetype="application/json", status=200)
