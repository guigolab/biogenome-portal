from .local_sample_api import LocalSampleApi
from .organism_api import OrganismsApi, OrganismApi
from .parser_api import ExcelParser
from .taxonomy_api import TreeApi,TaxNodesApi
from .data_input_api import Login,Logout,Users
from .bioproject_api import BioProjectApi
from .assembly_api import AssemblyApi
from .geo_localization_api import GeoLocApi
from .annotation_api import AnnotationApi
from .biosample_api import BioSampleApi
from .reads import ExperimentApi
def initialize_routes(api):

	#generate token
	api.add_resource(Login, '/api/login')
	api.add_resource(Logout, '/api/logout')

	api.add_resource(AnnotationApi, '/api/annotations', '/api/annotations/<name>')
	api.add_resource(AssemblyApi, '/api/assemblies', '/api/assemblies/<accession>')
	api.add_resource(BioSampleApi, '/api/biosamples', '/api/biosamples/<accession>')
	api.add_resource(LocalSampleApi, '/api/local_samples', '/api/local_samples/<local_id>')
	api.add_resource(ExperimentApi, '/api/experiments', '/api/experiments/<accession>')
	
	api.add_resource(OrganismsApi, '/api/organisms')
	api.add_resource(OrganismApi, '/api/organisms/<taxid>') 

	api.add_resource(Users, '/api/users','/api/users/<name>')
	##data portal endpoints
	api.add_resource(BioProjectApi, '/api/bioprojects', '/api/bioprojects/<accession>')
	api.add_resource(OrganismsApi, '/api/organisms')
	api.add_resource(OrganismApi, '/api/organisms/<taxid>') 
	api.add_resource(TaxNodesApi, '/api/taxons/<taxid>')
	# api.add_resource(SamplesApi, '/api/organisms', '/api/organisms/<accession>')
	# api.add_resource(BioSampleApi, '/api/biosamples')
	api.add_resource(TreeApi, '/api/tree/<taxid>') 
	api.add_resource(GeoLocApi, '/api/coordinates', '/api/coordinates/<coordinates>') ##expects lat:long dd format


	##parser endpoint
	api.add_resource(ExcelParser, '/api/excel')


