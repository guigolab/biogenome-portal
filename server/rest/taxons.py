from flask import Response, request
from flask_restful import Resource
from mongoengine import Document
from db.model import TaxonNode
from helpers.cache_key import cached_endpoint
from helpers.resource_mixins import (
    document_json_response,
    documents_json_response,
    json_message,
)
from helpers.service_utils import get_or_404

from services import taxons

_TREE_CACHE_TTL = 1800


class RootTaxonApi(Resource):
    """GET /taxons/root — configured portal root (``ROOT_NODE``); same JSON shape as ``/taxons/<taxid>``."""

    def get(self):
        taxon = taxons.get_root_taxon()
        return document_json_response(taxon)


class TaxonApi(Resource):
    def get(self, taxid):
        taxon = get_or_404(TaxonNode, f"Taxon {taxid} not found!", taxid=taxid)
        return document_json_response(taxon)


class TaxonChildrenApi(Resource):
    @cached_endpoint(timeout=_TREE_CACHE_TTL)
    def get(self, taxid):
        items = taxons.get_taxon_children(taxid)
        return documents_json_response(items)


class TaxonAncestoresApi(Resource):
    def get(self, taxid):
        resp = taxons.get_ancestors(taxid)
        return Response(resp, mimetype="application/json", status=200)


class RelativeTaxonomyTreeApi(Resource):
    @cached_endpoint(timeout=_TREE_CACHE_TTL)
    def get(self, taxid):
        taxon, status = taxons.get_closest_taxon(taxid)
        if isinstance(taxon, Document):
            return document_json_response(taxon, status=status)
        return json_message(str(taxon) if taxon else "Taxon not found", status=status)


class RootTreeApi(Resource):
    def get(self):
        # jsonl/tsv responses stream directly from MongoDB; only json format is safe to cache.
        fmt = request.args.get("format", "json")
        if fmt == "json":
            return _root_tree_json_cached()
        return taxons.root_tree_response(fmt)


@cached_endpoint(timeout=_TREE_CACHE_TTL)
def _root_tree_json_cached():
    return taxons.root_tree_response("json")
