# from rest.taxon_files import TaxonFilesApi
# from logging import root
import services.tree_service as service
from flask import Response
from flask import current_app as app
from db.models import TaxonNode
from flask_restful import Resource
# from mongoengine.errors import DoesNotExist, NotUniqueError, ValidationError
# from errors import InternalServerError, SchemaValidationError, UserNotFoundError, EmailAlreadyExistError
import json
from utils.constants import TaxonPipeline

class TreeApi(Resource):
    def get(self, node):
        tax_node = TaxonNode.objects(name=node).first()
        ##render tree on the fly
        tree = service.create_tree(tax_node)
        return Response(json.dumps(tree), mimetype="application/json", status=200)



class TaxNodesApi(Resource):
    def get(self,name):
        tax_node = TaxonNode.objects(name=name).aggregate(*TaxonPipeline).next()
        tax_node['isOpen'] = True
        for node in tax_node['children']:
            node['isOpen'] = False
        return Response(json.dumps(tax_node, default=str), mimetype="application/json", status=200)