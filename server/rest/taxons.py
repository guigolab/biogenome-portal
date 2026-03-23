from flask import Response, request
from flask_restful import Resource
from mongoengine import Document

from db.model import TaxonNode
from extensions.cache import cache
from helpers.resource_mixins import (
    document_json_response,
    documents_json_response,
    json_message,
)
from helpers.service_utils import get_or_404

from services import taxons


class TaxonApi(Resource):
    def get(self, taxid):
        taxon = get_or_404(TaxonNode, f"Taxon {taxid} not found!", taxid=taxid)
        return document_json_response(taxon)


class TaxonChildrenApi(Resource):
    def get(self, taxid):
        items = taxons.get_taxon_children(taxid)
        return documents_json_response(items)


class TaxonAncestoresApi(Resource):
    def get(self, taxid):
        resp = taxons.get_ancestors(taxid)
        return Response(resp, mimetype="application/json", status=200)


class RelativeTaxonomyTreeApi(Resource):
    @cache.cached(timeout=300)
    def get(self, taxid):
        taxon, status = taxons.get_closest_taxon(taxid)
        if isinstance(taxon, Document):
            return document_json_response(taxon, status=status)
        return json_message(str(taxon) if taxon else "Taxon not found", status=status)


class RootTreeApi(Resource):
    def get(self):
        # ?format=json | jsonl | tsv  (default json). jsonl/tsv stream from MongoDB without caching.
        fmt = request.args.get("format", "json")
        return taxons.root_tree_response(fmt)
