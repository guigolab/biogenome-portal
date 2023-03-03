from .user import users_controller
from .local_sample import local_samples_controller 
from .bioproject import bioprojects_controller
from .biosample import biosamples_controller
from .assembly import assemblies_controller
from .read import reads_controller
from .organism import organisms_controller
from .taxon import taxons_controller
from .annotation import annotations_controller
from .dump import dumps_controller
from .cronjob import cronjobs_controller
from .stats import stats_controller
from .upload import uploads_controller
from .taxonomy import taxonomy_controller

def initialize_routes(api):

	##ADMIN
	api.add_resource(users_controller.LoginApi, '/api/login')
	api.add_resource(users_controller.LogoutApi, '/api/logout')
	api.add_resource(cronjobs_controller.CronJobApi, '/api/cronjob', '/api/cronjob/<model>')
	api.add_resource(dumps_controller.DumpApi, '/api/dumps/<model>')
	api.add_resource(uploads_controller.ExcelParserApi, '/api/spreadsheet_upload')

	##TAXONOMY
	api.add_resource(taxonomy_controller.TreeApi,'/api/tree', '/api/tree/<taxid>')
	api.add_resource(taxonomy_controller.TreeStatusApi,'/api/tree/<taxid>/status')
	api.add_resource(taxonomy_controller.TreeLevelsApi, '/api/tree_levels', '/api/tree_levels/<taxid>')
	api.add_resource(taxonomy_controller.TaxonomyTreeApi, '/api/taxonomy_tree/<taxid>') 
	
	##ANNOTATIONS
	api.add_resource(annotations_controller.AnnotationsApi, '/api/annotations')
	api.add_resource(annotations_controller.AnnotationApi,  '/api/annotations/<name>')

	##ASSEMBLIES
	api.add_resource(assemblies_controller.AssembliesApi, '/api/assemblies')
	api.add_resource(assemblies_controller.AssemblyApi,  '/api/assemblies/<accession>')

	##BIOSAMPLES
	api.add_resource(biosamples_controller.BioSamplesApi, '/api/biosamples')
	api.add_resource(biosamples_controller.BioSampleApi, '/api/biosamples/<accession>')
	api.add_resource(biosamples_controller.BioSampleBioProjectsApi, '/api/biosamples/<accession>/bioprojects') 
	api.add_resource(biosamples_controller.BioSampleRelatedDataApi, '/api/biosamples/<accession>/<model>') 


	##LOCAL_SAMPLES
	api.add_resource(local_samples_controller.LocalSamplesApi, '/api/local_samples')
	api.add_resource(local_samples_controller.LocalSampleApi, '/api/local_samples/<local_id>')
	
	##READS (Experiment Document in DB)
	api.add_resource(reads_controller.ExperimentApi, '/api/reads/<accession>')
	api.add_resource(reads_controller.ExperimentsApi, '/api/reads')
	
	##ORGANISMS
	api.add_resource(organisms_controller.OrganismsApi, '/api/organisms')
	api.add_resource(organisms_controller.OrganismApi, '/api/organisms/<taxid>')
	api.add_resource(organisms_controller.OrganismLineageApi, '/api/organisms/<taxid>/lineage')
	api.add_resource(organisms_controller.OrganismBioProjectsApi, '/api/organisms/<taxid>/bioprojects')
	api.add_resource(organisms_controller.OrganismSankeyDataApi, '/api/organisms/<taxid>/sankey')
	api.add_resource(organisms_controller.OrganismRelatedDataApi, '/api/organisms/<taxid>/<model>') 

	##BIOPROJECTS
	api.add_resource(bioprojects_controller.BioProjectsApi, '/api/bioprojects')
	api.add_resource(bioprojects_controller.BioProjectApi, '/api/bioprojects/<accession>')
	api.add_resource(bioprojects_controller.BioProjectCoordinatesApi, '/api/bioprojects/<accession>/coordinates')
	api.add_resource(bioprojects_controller.BioProjectCountriesApi, '/api/bioprojects/<accession>/countries')
	api.add_resource(bioprojects_controller.BioProjectChildrenApi, '/api/bioprojects/<accession>/children')
	


	##TAXONS
	api.add_resource(taxons_controller.TaxonsApi, '/api/taxons')
	api.add_resource(taxons_controller.TaxonApi, '/api/taxons/<taxid>')
	api.add_resource(taxons_controller.TaxonCoordinatesApi, '/api/taxons/<taxid>/coordinates')
	api.add_resource(taxons_controller.TaxonChildrenApi, '/api/taxons/<taxid>/children')


	##USERS
	api.add_resource(users_controller.UsersApi, '/api/users')
	api.add_resource(users_controller.UserApi,'/api/users/<name>')

	##STATS TODO: IMPROVE IT.. 
	api.add_resource(stats_controller.StatsApi,'/api/stats')
	api.add_resource(stats_controller.FieldStatsApi, '/api/stats/<model>')



