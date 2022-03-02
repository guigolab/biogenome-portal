from .organisms import OrganismsApi, OrganismApi, OrganismsSearchApi
from .parser_api import ExcelParserApi
from .tree_api import TreeApi,TaxNodesApi
from .data_input_api import Login
from .samples_api import SamplesApi
from .data_api import OrganismData

def initialize_routes(api):

	
	#generate token
	api.add_resource(Login, '/api/login')

	##data portal endpoints
	api.add_resource(OrganismsApi, '/api/root_organisms')
	api.add_resource(OrganismsSearchApi, '/api/root_organisms/search')
	api.add_resource(OrganismApi, '/api/root_organisms/<name>') 
	api.add_resource(OrganismData, '/api/data/<model>')
	api.add_resource(TaxNodesApi, '/api/taxons/<name>')
	api.add_resource(SamplesApi, '/api/organisms', '/api/organisms/<accession>')
	api.add_resource(TreeApi,'/api/tree/<node>') 


	##parser endpoint
	api.add_resource(ExcelParserApi, '/api/excel')


