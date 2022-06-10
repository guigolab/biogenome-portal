
import services.tree_service as service
from flask import Response,request
from db.models import TaxonNode
from flask_restful import Resource
from utils.pipelines import TaxonPipeline
import json
from flask import current_app as app


class TreeApi(Resource):
    def get(self, node):
        max_nodes = int(request.args['maxLeaves'])
        tax_node = TaxonNode.objects(name=node).first()
        ##render tree on the fly
        tree = service.create_tree(tax_node, max_nodes)
        return Response(json.dumps(tree), mimetype="application/json", status=200)



class TaxNodesApi(Resource):
    def get(self,taxid):
        tax_node= TaxonNode.objects(taxid=taxid).first()
        children = TaxonNode.objects(taxid__in=tax_node.children).to_json()
        # tax_node['isOpen'] = False
        # for node in tax_node['children']:
        #     node['isOpen'] = False
        return Response(children, mimetype="application/json", status=200)