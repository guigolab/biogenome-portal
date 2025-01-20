from . import config_service
from flask import Response
from flask_restful import Resource
from helpers import data
from extensions.cache import cache

##stats about the BGP instance
class ConfigApi(Resource):
	@cache.cached(timeout=300)
	def get(self):
		config = config_service.load_json_config()
		return Response(data.dump_json(config),mimetype="application/json", status=200)

