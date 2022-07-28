from services import taxonomy_service
from flask import Response,request
from flask_restful import Resource
import json



class TreeApi(Resource):
    def get(self, taxid):
        # max_nodes = int(request.args['maxLeaves'])
        ##render tree on the fly
        #TODO ADD LEVEL CONTROL ON TREE
        tree = taxonomy_service.create_tree(taxid)
        return Response(json.dumps(tree), mimetype="application/json", status=200)


class TaxNodesApi(Resource):
    def get(self,taxid):
        return Response(json.dumps(taxonomy_service.get_children(taxid)), mimetype="application/json", status=200)
          