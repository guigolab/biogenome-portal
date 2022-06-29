from .organism_api import OrganismsApi, OrganismApi
from .parser_api import ExcelParser
from .tree_api import TreeApi,TaxNodesApi
from .data_input_api import Login,Logout,Users
from .data_api import OrganismData
from .bioprojects_api import BioProjectApi
from .statistics_api import StatisticsApi
from .geo_localization_api import GeoLocApi
def initialize_routes(api):

	
	#generate token
	api.add_resource(Login, '/api/login')
	api.add_resource(Logout, '/api/logout')


	api.add_resource(Users, '/api/users','/api/users/<name>')
	api.add_resource(StatisticsApi, '/api/statistics')
	##data portal endpoints
	api.add_resource(BioProjectApi, '/api/bioprojects', '/api/bioprojects/<accession>')
	api.add_resource(OrganismsApi, '/api/organisms')

	api.add_resource(OrganismApi, '/api/organisms/<taxid>') 
	api.add_resource(OrganismData, '/api/data/<model>')
	api.add_resource(TaxNodesApi, '/api/taxons/<taxid>')
	# api.add_resource(SamplesApi, '/api/organisms', '/api/organisms/<accession>')
	# api.add_resource(BioSampleApi, '/api/biosamples')
	api.add_resource(TreeApi,'/api/tree','/api/tree/<node>') 
	api.add_resource(GeoLocApi, '/api/coordinates', '/api/coordinates/<coordinates>') ##expects lat:long dd format


	##parser endpoint
	api.add_resource(ExcelParser, '/api/excel')


