# from rest.taxon_files import TaxonFilesApi
# from logging import root
import services.taxon_service as service
from flask import Response
# from flask import current_app as app
from db.models import TaxonNode
from flask_restful import Resource
# from mongoengine.errors import DoesNotExist, NotUniqueError, ValidationError
# from errors import InternalServerError, SchemaValidationError, UserNotFoundError, EmailAlreadyExistError
import json

class TreeApi(Resource):
    def get(self, node):
        tax_node = TaxonNode.objects(name = node).first()
        ##render tree on the fly
        tree = service.create_tree(tax_node)
        return Response(json.dumps(tree), mimetype="application/json", status=200)

class TaxNodesApi(Resource):
    def get(self,name):
        tax_node = TaxonNode.objects(name = name).first()
        json_resp = json.loads(tax_node.to_json())
        json_resp['isOpen'] = True
        json_resp['children'] = [json.loads(lazy_ref.fetch().to_json()) for lazy_ref in tax_node.children]
        for node in json_resp['children']:
            node['isOpen'] = False
        return Response(json.dumps(json_resp), mimetype="application/json", status=200)