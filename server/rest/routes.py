from .cronjob import cronjobs_controller
from .user import users_controller
from .local_sample import local_samples_controller 
from .biosample import biosamples_controller
from .assembly import assemblies_controller
from .read import reads_controller
from .organism import organisms_controller
from .taxon import taxons_controller
from .annotation import annotations_controller
from .dump import dumps_controller
from .stats import stats_controller
from .upload import uploads_controller
from .taxonomy import taxonomy_controller
from .goat_report import goat_reports_controller
from .sample_location import sample_locations_controller

def initialize_routes(api):

	##ADMIN
	api.add_resource(users_controller.LoginApi, '/api/login')
	api.add_resource(users_controller.LogoutApi, '/api/logout')
	api.add_resource(dumps_controller.DumpApi, '/api/dumps/<model>')
	api.add_resource(uploads_controller.ExcelParserApi, '/api/spreadsheet_upload')
	api.add_resource(goat_reports_controller.GoaTReportApi,'/api/goat_report')
	api.add_resource(cronjobs_controller.CronJobApi, '/api/cronjob', '/api/cronjob/<model>')

	##GEOGRAPHIC LOCATIONS
	api.add_resource(sample_locations_controller.SampleLocationsByTaxon, '/api/taxons/<taxid>/coordinates')
	api.add_resource(sample_locations_controller.SampleLocationsByOrganism, '/api/organisms/<taxid>/coordinates')
	api.add_resource(sample_locations_controller.SampleLocationsByBioSample, '/api/biosamples/<accession>/coordinates' )
	api.add_resource(sample_locations_controller.SampleLocationsByLocalSample, '/api/local_samples/<local_id>/coordinates')

	##TAXONOMY
	api.add_resource(taxonomy_controller.TreeApi,'/api/tree', '/api/tree/<taxid>')
	api.add_resource(taxonomy_controller.RelativeTaxonomyTreeApi, '/api/tree/<taxid>/relative') 

	##ANNOTATIONS
	api.add_resource(annotations_controller.AnnotationsApi, '/api/annotations')
	api.add_resource(annotations_controller.AnnotationApi,  '/api/annotations/<name>')
	api.add_resource(annotations_controller.StreamAnnotations, '/api/download/<filename>')
	##ASSEMBLIES
	api.add_resource(assemblies_controller.AssembliesApi, '/api/assemblies')
	api.add_resource(assemblies_controller.AssemblyApi,  '/api/assemblies/<accession>')
	api.add_resource(assemblies_controller.AssemblyRelatedAnnotationsApi, '/api/assemblies/<accession>/annotations')
	api.add_resource(assemblies_controller.AssemblyChrAliasesApi, '/api/assemblies/<accession>/chr_aliases')

	##BIOSAMPLES
	api.add_resource(biosamples_controller.BioSamplesApi, '/api/biosamples')
	api.add_resource(biosamples_controller.BioSampleApi, '/api/biosamples/<accession>')
	api.add_resource(biosamples_controller.ExperimentsByBiosample, '/api/biosamples/<accession>/experiments')
	api.add_resource(biosamples_controller.AssembliesByBiosample, '/api/biosamples/<accession>/assemblies')
	api.add_resource(biosamples_controller.SubSamplesApi, '/api/biosamples/<accession>/sub_samples')

	##LOCAL_SAMPLES
	api.add_resource(local_samples_controller.LocalSamplesApi, '/api/local_samples')
	api.add_resource(local_samples_controller.LocalSampleApi, '/api/local_samples/<local_id>')
	
	##READS (Experiment Document in DB)
	api.add_resource(reads_controller.ReadsByExperiment, '/api/experiments/<accession>/reads')
	api.add_resource(reads_controller.ExperimentApi, '/api/experiments/<accession>')
	api.add_resource(reads_controller.ExperimentsApi, '/api/experiments')
	
	##ORGANISMS
	api.add_resource(organisms_controller.OrganismsApi, '/api/organisms')
	api.add_resource(organisms_controller.OrganismApi, '/api/organisms/<taxid>')
	##CRUDS

	api.add_resource(organisms_controller.OrganismLineageApi, '/api/organisms/<taxid>/lineage')
	api.add_resource(organisms_controller.OrganismRelatedDataApi, '/api/organisms/<taxid>/<model>') 

	##TAXONS
	api.add_resource(taxons_controller.TaxonsApi, '/api/taxons')
	api.add_resource(taxons_controller.TaxonApi, '/api/taxons/<taxid>')
	api.add_resource(taxons_controller.TaxonChildrenApi, '/api/taxons/<taxid>/children')


	##USERS
	api.add_resource(users_controller.UsersApi, '/api/users')
	api.add_resource(users_controller.UserApi,'/api/users/<name>')



	##STATS TODO: IMPROVE IT.. 
	api.add_resource(stats_controller.StatsApi,'/api/stats')
	api.add_resource(stats_controller.FieldStatsApi, '/api/stats/<model>')



