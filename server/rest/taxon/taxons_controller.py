from . import taxons_service
from flask import Response,request
from flask_restful import Resource
from db.models import TaxonNode
from errors import NotFound
import json

class TaxonsApi(Resource):
    def get(self):
        total, data = taxons_service.get_taxons(**request.args)
        json_resp = dict(total=total, data=list(data.as_pymongo()))
        return Response(json.dumps(json_resp),mimetype="application/json", status=200)

class TaxonApi(Resource):
    def get(self, taxid):
        taxon = TaxonNode.objects(taxid=taxid).first()
        if not taxon:
            raise NotFound
        return Response(taxon.to_json(), mimetype="application/json", status=200)
