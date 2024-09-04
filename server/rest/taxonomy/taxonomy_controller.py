from . import taxonomy_service
from flask import Response,request
from flask_restful import Resource
from extensions.cache import cache
import json

class TreeApi(Resource):
    @cache.cached(timeout=300)
    def get(self, taxid):
        tree = taxonomy_service.create_tree(taxid)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        tree = taxonomy_service.generate_tree(data)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

class RelativeTaxonomyTreeApi(Resource):
    @cache.cached(timeout=300)
    def get(self,taxid):
        taxon, status = taxonomy_service.get_closest_taxon(taxid)
        return Response(taxon.to_json(), mimetype="application/json", status=status)

class RootTreeApi(Resource):
    def get(self):
        return taxonomy_service.get_root_tree()