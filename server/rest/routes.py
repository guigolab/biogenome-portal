from .organisms import OrganismsApi, OrganismApi
from .parser_api import ExcelParserApi
from .tree_api import TreeApi,TaxNodesApi
from .data_input_api import Login
from .samples_api import SamplesApi,BioSampleApi, GeoLocApi
from .data_api import OrganismData
from .bioprojects_api import BioProjectApi

def initialize_routes(api):

	
	#generate token
	api.add_resource(Login, '/api/login')

	##data portal endpoints
	api.add_resource(BioProjectApi, '/api/bioprojects')
	api.add_resource(OrganismsApi, '/api/root_organisms')
	api.add_resource(OrganismApi, '/api/root_organisms/<name>') 
	api.add_resource(OrganismData, '/api/data/<model>')
	api.add_resource(TaxNodesApi, '/api/taxons/<name>')
	api.add_resource(SamplesApi, '/api/organisms', '/api/organisms/<accession>')
	api.add_resource(BioSampleApi, '/api/biosamples')
	api.add_resource(TreeApi,'/api/tree/<node>') 
	api.add_resource(GeoLocApi, '/api/coordinates')


	##parser endpoint
	api.add_resource(ExcelParserApi, '/api/excel')


