from .cronjob import cronjobs_controller
from .user import users_controller
from .local_sample import local_samples_controller
from .biosample import biosamples_controller
from .assembly import assemblies_controller
from .read import reads_controller
from .organism import organisms_controller
from .taxon import taxons_controller
from .annotation import annotations_controller
from .stats import stats_controller
from .taxonomy import taxonomy_controller
from .goat_report import goat_reports_controller
from .sample_location import sample_locations_controller
from .sub_project import sub_projects_controller
from .common.catalog_resources import CatalogListApi, CatalogQueryApi


def initialize_routes(api):

	##AUTH
	api.add_resource(users_controller.LoginApi, '/api/login')
	api.add_resource(users_controller.LogoutApi, '/api/logout')
 
	##UPLOAD/DOWNLOAD GOAT COMPLIANT REPORTS
	api.add_resource(goat_reports_controller.GoaTReportApi,'/api/goat_report')

	##TASK PROGRESS
	api.add_resource(cronjobs_controller.TaskStatusAPI, '/api/tasks/<task_id>')
	##STATS TODO: IMPROVE IT.. 
	api.add_resource(stats_controller.FieldStatsApi, '/api/stats/<model>/<field>')

	##TAXONOMY
	api.add_resource(taxonomy_controller.RootTreeApi, '/api/tree')

	api.add_resource(sample_locations_controller.SampleLocations, '/api/coordinates')
	api.add_resource(sample_locations_controller.LocationFromCoords, '/api/coordinates/<coordinates>')

	api.add_resource(sample_locations_controller.UniqueLocations, '/api/coordinates/frequency')
	api.add_resource(sample_locations_controller.LookupRelatedData, '/api/coordinates/frequency/lookup')
	api.add_resource(sample_locations_controller.GetRelatedModelData, '/api/coordinates/frequency/lookup/<model>')
	api.add_resource(sample_locations_controller.DownloadRelatedDataApi, '/api/coordinates/frequency/download')

	##SUB_PROJECTS
	api.add_resource(sub_projects_controller.SubProjectsApi, '/api/sub_projects')
	api.add_resource(sub_projects_controller.SubProjectApi, '/api/sub_projects/<name>')
	api.add_resource(sub_projects_controller.SubProjectRelatedSpecies,  '/api/sub_projects/<name>/organisms')
	api.add_resource(sub_projects_controller.SubProjectRelatedUsers,  '/api/sub_projects/<name>/users')

	## CATALOG — GET/POST /api/<catalog_model>, POST /api/<catalog_model>/query (helpers.data.MODEL_MAPPER)
	# Static paths under the same prefixes (e.g. /query, /import, /submit) must stay registered separately.
	api.add_resource(CatalogQueryApi, '/api/<catalog_model:catalog_key>/query')
	api.add_resource(CatalogListApi, '/api/<catalog_model:catalog_key>')

	##ORGANISMS (extensions; list/create live on catalog routes)
	api.add_resource(organisms_controller.UnassignedOrganismsApi, '/api/organisms/unassigned')
	api.add_resource(organisms_controller.OrganismsWithUser, '/api/organisms/with_users')

	api.add_resource(organisms_controller.OrganismApi, '/api/organisms/<taxid>')
	api.add_resource(organisms_controller.OrganismLineageApi, '/api/organisms/<taxid>/lineage')
	api.add_resource(organisms_controller.OrganismRelatedDataApi, '/api/organisms/<taxid>/<model>') 

	api.add_resource(organisms_controller.OrganismToDeleteApi, '/api/organism_deletion_requests/<taxid>')

	##ASSEMBLIES
	api.add_resource(assemblies_controller.AssembliesImportApi, '/api/assemblies/import')

	api.add_resource(assemblies_controller.AssembliesFromAnnotations, '/api/assemblies/from_annotations')
	api.add_resource(assemblies_controller.AssemblyApi,  '/api/assemblies/<accession>')
	api.add_resource(assemblies_controller.AssemblyRelatedAnnotationsApi, '/api/assemblies/<accession>/annotations')
	api.add_resource(assemblies_controller.AssembliesRelatedChromosomesApi, '/api/assemblies/<accession>/chromosomes')
	api.add_resource(assemblies_controller.AssemblyChrAliasesApi, '/api/assemblies/<accession>/chr_aliases')

	##CRONJOBS
	api.add_resource(cronjobs_controller.CronJobApi, '/api/cronjob', '/api/cronjob/<model>/<action>')

	##ANNOTATIONS (detail + download; list/create on catalog routes)
	api.add_resource(annotations_controller.AnnotationApi,  '/api/annotations/<name>')
	api.add_resource(annotations_controller.StreamAnnotations, '/api/download/<filename>')
	
	##BIOSAMPLES
	api.add_resource(biosamples_controller.BioSampleChecklist, '/api/biosamples/checklist')

	api.add_resource(biosamples_controller.BioSamplesSubmit, '/api/biosamples/submit')  # Define first
	api.add_resource(biosamples_controller.BioSampleSubmit, '/api/biosamples/submit/<accession>')  # Define first

	api.add_resource(biosamples_controller.BioSampleApi, '/api/biosamples/<accession>') 
	api.add_resource(biosamples_controller.ReadsByBiosample, '/api/biosamples/<accession>/reads')
	api.add_resource(biosamples_controller.AssembliesByBiosample, '/api/biosamples/<accession>/assemblies')
	api.add_resource(biosamples_controller.SubSamplesApi, '/api/biosamples/<accession>/sub_samples')

	##LOCAL_SAMPLES
	api.add_resource(local_samples_controller.LocalSampleUploadApi, '/api/local_samples/upload')
	api.add_resource(local_samples_controller.LocalSampleApi, '/api/local_samples/<local_id>')


	##READ RUNS (INSDC)
	api.add_resource(reads_controller.ReadsImportApi, '/api/reads/import/<accession>')
	api.add_resource(reads_controller.ReadApi, '/api/reads/<run_accession>')

	## Deprecated: /api/experiments (410 Gone — use /api/reads)
	api.add_resource(reads_controller.ExperimentsApi, '/api/experiments')
	api.add_resource(reads_controller.ExperimentsQueryApi, '/api/experiments/query')
	api.add_resource(reads_controller.ExperimentApi, '/api/experiments/<accession>')
	api.add_resource(reads_controller.ReadsByExperiment, '/api/experiments/<accession>/reads')

	##TAXONS
	api.add_resource(taxons_controller.TaxonApi, '/api/taxons/<taxid>')
	api.add_resource(taxons_controller.TaxonChildrenApi, '/api/taxons/<taxid>/children')
	api.add_resource(taxons_controller.TaxonAncestoresApi, '/api/taxons/<taxid>/ancestors')

	api.add_resource(taxonomy_controller.RelativeTaxonomyTreeApi, '/api/taxons/<taxid>/lookup') 

	##USERS
	api.add_resource(users_controller.UsersApi, '/api/users')
	api.add_resource(users_controller.UserApi,'/api/users/<name>')
	api.add_resource(users_controller.UserLookup,'/api/users/<name>/lookup')

	api.add_resource(users_controller.UserRelatedSpecies,'/api/users/<name>/organisms')
	# api.add_resource(users_controller.HandleOrganismToUser,'/api/users/<name>/organisms/<taxid>')

	api.add_resource(users_controller.UserRelatedSamples,'/api/users/<name>/local_samples')
	api.add_resource(users_controller.UserSubmittedSamples,'/api/users/<name>/submitted_biosamples')



