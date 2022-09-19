from .bulk_load_api import BulkLoadApi
from .local_sample_api import LocalSampleApi
from .organism_api import OrganismsApi, OrganismApi
from .parser_api import ExcelParser
from .taxonomy_api import TreeApi,TaxNodesApi,TaxonomyTreeApi,TreeLevelsApi
from .data_input_api import Login,Logout
from .bioproject_api import BioProjectApi
from .assembly_api import AssemblyApi
from .geo_localization_api import GeoLocApi,NodeCoordinatesApi,ProjectCoordinatesApi,OrganismCoordinatesApi
from .annotation_api import AnnotationApi
from .biosample_api import BioSampleApi
from .read_api import ExperimentApi
from .user_api import UserApi
from .cronjob_api import CronJobApi
from .genome_browser_api import GenomeBrowserApi
from .statistics_api import StatsApi,OrganismStatsApi

def initialize_routes(api):

	api.add_resource(Login, '/api/login')

	api.add_resource(Logout, '/api/logout')

	api.add_resource(CronJobApi, '/api/cronjob')

	api.add_resource(BulkLoadApi, '/api/bulk/<model>')

	api.add_resource(AnnotationApi, '/api/annotations', '/api/annotations/<name>')
	
	api.add_resource(AssemblyApi, '/api/assemblies', '/api/assemblies/<accession>')
	
	api.add_resource(BioSampleApi, '/api/biosamples', '/api/biosamples/<accession>')
	
	api.add_resource(LocalSampleApi, '/api/local_samples', '/api/local_samples/<local_id>')
	
	api.add_resource(ExperimentApi, '/api/reads', '/api/reads/<accession>')
	
	api.add_resource(GenomeBrowserApi, '/api/genome_browser', '/api/genome_browser/<accession>') ##assembly accession
	
	api.add_resource(OrganismsApi, '/api/organisms')
	
	api.add_resource(OrganismStatsApi, '/api/organisms/statistics')

	api.add_resource(OrganismApi, '/api/organisms/<taxid>') 

	api.add_resource(UserApi, '/api/users','/api/users/<name>')
	
	api.add_resource(BioProjectApi, '/api/bioprojects', '/api/bioprojects/<accession>')
	
	api.add_resource(TaxNodesApi, '/api/taxons','/api/taxons/<taxid>')
	
	api.add_resource(TreeApi,'/api/tree', '/api/tree/<taxid>')

	api.add_resource(TreeLevelsApi, '/api/tree_levels', '/api/tree_levels/<taxid>')

	api.add_resource(TaxonomyTreeApi, '/api/taxonomy_tree/<taxid>') 
	
	api.add_resource(StatsApi, '/api/stats')

	api.add_resource(NodeCoordinatesApi, '/api/coordinates/node')

	api.add_resource(GeoLocApi, '/api/coordinates', '/api/coordinates/<coordinates>') ##expects lat:long dd format
	##parser endpoint

	api.add_resource(ProjectCoordinatesApi, '/api/coordinates/bioprojects/<accession>')

	api.add_resource(OrganismCoordinatesApi, '/api/coordinates/organisms/<taxid>')

	api.add_resource(ExcelParser, '/api/excel')


