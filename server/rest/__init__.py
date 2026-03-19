from flask_restful import Api

from .common.catalog_converter import CatalogModelConverter
from .routes import initialize_routes

api = None


def initialize_api(app):
	app.logger.info("Initializing REST Apis")
	app.url_map.converters["catalog_model"] = CatalogModelConverter
	api_instance = Api(app)
	initialize_routes(api_instance)