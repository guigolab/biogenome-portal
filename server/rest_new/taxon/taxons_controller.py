from . import taxons_service
from flask import Response,request
from flask_restful import Resource
from db.models import TaxonNode
from errors import NotFound
import json
import os


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


class TreeApi(Resource):
    def get(self, taxid):
        # max_nodes = int(request.args['maxLeaves'])
        ##render tree on the fly
        #TODO ADD LEVEL CONTROL ON TREE
        tree = taxons_service.create_tree(taxid)
        # resp = dict(tree=tree,levels=levels)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        tree = taxons_service.generate_tree(data)
        return Response(json.dumps(tree), mimetype="application/json", status=200)



class TaxonomyTreeApi(Resource):
    def get(self,taxid):
        tree = taxons_service.create_tree(taxid)
        return Response(json.dumps(tree), mimetype="application/json", status=200)


class TaxNodesApi(Resource):
    def get(self,taxid=None):
        if taxid:
            return Response(json.dumps(taxons_service.get_children(taxid, **request.args)), mimetype="application/json", status=200)
        result = taxons_service.search_taxons(**request.args)
        return Response(result,mimetype="application/json", status=200)
 
class TreeLevelsApi(Resource):
    def get(self,taxid=None):
        if not taxid:
            taxid = os.getenv('ROOT_NODE')
        levels = taxons_service.get_levels(taxid)
        return Response(json.dumps(levels), mimetype="application/json", status=200)
