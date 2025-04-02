from . import taxons_service
from flask import Response,request
from flask_restful import Resource
from helpers import data as data_helper

class TaxonsQueryApi(Resource):
    def post(self):
        data = request.json if request.is_json else request.form
        resp, mimetype = data_helper.get_items('taxons', data)
        return Response(resp, mimetype=mimetype, status=200)

class TaxonsApi(Resource):
    def get(self):
        resp, mimetype = data_helper.get_items('taxons', request.args)
        return Response(resp, mimetype=mimetype, status=200)

class TaxonApi(Resource):
    def get(self, taxid):
        taxon = taxons_service.get_taxon(taxid)
        return Response(taxon.to_json(), mimetype="application/json", status=200)

class TaxonChildrenApi(Resource):
    def get(self, taxid):
        items = taxons_service.get_taxon_children(taxid)
        return Response(items.to_json(), mimetype="application/json", status=200)
    
class TaxonAncestoresApi(Resource):
    def get(self, taxid):
        resp = taxons_service.get_ancestors(taxid)
        return Response(resp, mimetype="application/json", status=200)
    
