from . import taxonomy_service
from flask import Response,request
from flask_restful import Resource
import json
from errors import NotFound
from ..cronjob import cronjob_service
from db.models import ComputedTree

class TreeApi(Resource):
    def get(self, taxid):
        #TODO ADD LEVEL CONTROL ON TREE
        tree = taxonomy_service.create_tree(taxid)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        tree = taxonomy_service.generate_tree(data)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

class RelativeTaxonomyTreeApi(Resource):
    def get(self,taxid):
        taxon, status = taxonomy_service.get_closest_taxon(taxid)
        return Response(taxon.to_json(), mimetype="application/json", status=status)

class ComputedTreeApi(Resource):
    def get(self):
        cronjob_service.compute_tree()
        return Response(ComputedTree.objects().exclude('id').first().to_json(),mimetype="application/json", status=200)