from flask import Response
from flask_restful import Resource

from db.models import TaxonNode
from rest.common.service_utils import get_or_404

from . import taxons_service


class TaxonApi(Resource):
    def get(self, taxid):
        taxon = get_or_404(TaxonNode, f"Taxon {taxid} not found!", taxid=taxid)
        return Response(taxon.to_json(), mimetype="application/json", status=200)

class TaxonChildrenApi(Resource):
    def get(self, taxid):
        items = taxons_service.get_taxon_children(taxid)
        return Response(items.to_json(), mimetype="application/json", status=200)
    
class TaxonAncestoresApi(Resource):
    def get(self, taxid):
        resp = taxons_service.get_ancestors(taxid)
        return Response(resp, mimetype="application/json", status=200)
    
