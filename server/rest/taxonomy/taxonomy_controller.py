from . import taxonomy_service
from flask import Response,request
from flask_restful import Resource
from extensions.cache import cache

class RelativeTaxonomyTreeApi(Resource):
    @cache.cached(timeout=300)
    def get(self,taxid):
        taxon, status = taxonomy_service.get_closest_taxon(taxid)
        return Response(taxon.to_json(), mimetype="application/json", status=status)

class RootTreeApi(Resource):
    def get(self):
        # ?format=json | jsonl | tsv  (default json). jsonl/tsv stream from MongoDB without caching.
        fmt = request.args.get("format", "json")
        return taxonomy_service.root_tree_response(fmt)
