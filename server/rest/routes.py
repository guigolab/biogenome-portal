from .organisms import OrganismsApi, OrganismApi, OrganismsSearchApi, SampleApi
from .parser_api import ExcelParserApi, XMLParserApi
from .tree_api import TreeApi,TaxNodesApi
from .statistics_api import StatisticsApi
from .data_input_api import InputDataApi

def initialize_routes(api):

	api.add_resource(InputDataApi, '/api/input', '/api/input/<value>')
	# api.add_resource(WebHookApi, '/api/webhook')

	##data portal endpoints
	api.add_resource(OrganismsApi, '/api/root_organisms')
	api.add_resource(OrganismsSearchApi, '/api/root_organisms/search')
	api.add_resource(OrganismApi, '/api/root_organisms/<name>') 
	api.add_resource(TaxNodesApi, '/api/taxons/<name>')
	api.add_resource(SampleApi, '/api/organisms/<accession>')
	api.add_resource(TreeApi,'/api/tree/<node>') 
	api.add_resource(StatisticsApi, '/api/statistics')


	##parser endpoint
	api.add_resource(ExcelParserApi, '/api/excel')
	api.add_resource(XMLParserApi, '/api/xml', '/api/xml/<value>')


