from flask_restful import Api
from .routes import initialize_routes
from errors import errors

api = None

def initialize_api(app):
	app.logger.info("Initializing REST Apis")
	api = Api(app, errors=errors)
	initialize_routes(api)