
import services.tree_service as service
from flask import Response,request
from db.models import TaxonNode
from flask_restful import Resource
from utils.pipelines import TaxonPipeline
import json
from flask import current_app as app


class TreeApi(Resource):
    def get(self, taxid):
        tree = service.create_tree(taxid, **request.args)
        return Response(json.dumps(tree), mimetype="application/json", status=200)
        

class TreeLevels(Resource):
    def get(self,node):
        return Response(json.dumps(service.get_levels(node)))


class TaxNodesApi(Resource):
    def get(self,taxid):
        return Response(json.dumps(service.get_tree_item(taxid)), mimetype="application/json", status=200)