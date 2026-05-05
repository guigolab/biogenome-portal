"""
HTTP API wiring: Flask-RESTful app setup and route registration.

:class:`initialize_api` is the entrypoint called from :mod:`app` (with ``cwd`` /
``PYTHONPATH`` set to ``server/``).

Order of URL registration matters: more specific rules before broader patterns
that share the same prefix (e.g. ``/api/biosamples/submit`` before
``/api/biosamples/<accession>``).

Controller modules under :mod:`rest` are imported lazily inside :func:`_rows`
when :func:`initialize_routes` runs, so importing :mod:`routes` does not load
every resource class up front.
"""

from __future__ import annotations

from flask_restful import Api

from helpers.catalog_converter import CatalogModelConverter


def initialize_api(app) -> None:
    """Register URL converters and mount all REST resources on ``app``."""
    app.logger.info("Initializing REST Apis")
    app.url_map.converters["catalog_model"] = CatalogModelConverter
    api = Api(app)
    initialize_routes(api)


def _rows():
    from rest import (
        annotations,
        assemblies,
        biosamples,
        jbrowse,
        cronjobs,
        goat_reports,
        local_samples,
        organisms,
        publications,
        reads,
        sample_locations,
        stats,
        taxons,
        users,
    )
    from rest.catalog_resources import CatalogListApi, CatalogQueryApi

    return (
        # --- Auth ---
        (users.LoginApi, "/api/login"),
        (users.LogoutApi, "/api/logout"),
        # --- Publication lookup ---
        (publications.PublicationLookupApi, "/api/publications/lookup"),
        # --- GoaT reports ---
        (goat_reports.GoaTReportApi, "/api/goat_report"),
        # --- Async task status ---
        (cronjobs.TaskStatusAPI, "/api/tasks/<task_id>"),
        # --- Stats (POST /api/stats/<model> before path-based GET so body carries field) ---
        (stats.FieldStatsByModelApi, "/api/stats/<model>"),
        (stats.FieldStatsApi, "/api/stats/<model>/<field>"),
        # --- Taxonomy tree (root table only; portal UI slices client-side) ---
        (taxons.RootTreeApi, "/api/tree"),
        # --- JBrowse genome browser ---
        (jbrowse.JBrowseSessionsApi, "/api/jbrowse/sessions"),
        (jbrowse.JBrowseAssemblyContextApi, "/api/jbrowse/assemblies/<accession>/context"),
        # --- Sample locations / coordinates ---
        (sample_locations.SampleLocations, "/api/coordinates"),
        (sample_locations.LocationFromCoords, "/api/coordinates/<coordinates>"),
        (sample_locations.UniqueLocations, "/api/coordinates/frequency"),
        (sample_locations.OrganismsWithSampleLocations, "/api/coordinates/organisms"),
        (sample_locations.LookupRelatedData, "/api/coordinates/frequency/lookup"),
        (
            sample_locations.GetRelatedModelData,
            "/api/coordinates/frequency/lookup/<model>",
        ),
        (sample_locations.DownloadRelatedDataApi, "/api/coordinates/frequency/download"),
        # --- Catalog (list/query); static paths under same prefixes registered separately ---
        (CatalogQueryApi, "/api/<catalog_model:catalog_key>/query"),
        (CatalogListApi, "/api/<catalog_model:catalog_key>"),
        # --- Organisms (extensions; list/create on catalog routes) ---
        (organisms.UnassignedOrganismsApi, "/api/organisms/unassigned"),
        (organisms.OrganismAuditLogsApi, "/api/organisms/audit_logs"),
        (organisms.OrganismTaxidAuditLogsApi, "/api/organisms/<taxid>/audit_logs"),
        (organisms.OrganismsWithUser, "/api/organisms/with_users"),
        (organisms.OrganismSuggestImagesApi, "/api/organisms/suggest_external_images"),
        (organisms.OrganismApi, "/api/organisms/<taxid>"),
        (organisms.OrganismLineageApi, "/api/organisms/<taxid>/lineage"),
        (organisms.OrganismRelatedDataApi, "/api/organisms/<taxid>/<model>"),
        (organisms.OrganismToDeleteApi, "/api/organism_deletion_requests/<taxid>"),
        # --- Assemblies ---
        (assemblies.AssembliesImportApi, "/api/assemblies/import"),
        (assemblies.AssembliesFromAnnotations, "/api/assemblies/from_annotations"),
        (assemblies.AssemblyApi, "/api/assemblies/<accession>"),
        (assemblies.AssemblyRelatedAnnotationsApi, "/api/assemblies/<accession>/annotations"),
        (assemblies.AssembliesRelatedChromosomesApi, "/api/assemblies/<accession>/chromosomes"),
        (assemblies.AssemblyChrAliasesApi, "/api/assemblies/<accession>/chr_aliases"),
        # --- Cron jobs (admin enqueue + worker snapshot); specific paths before generic ---
        (cronjobs.OrganismsTsvImportApi, "/api/cronjob/import/organisms_tsv"),
        (cronjobs.CronJobApi, ("/api/cronjob", "/api/cronjob/<model>/<action>")),
        # --- Annotations (detail + download; list/create on catalog routes) ---
        (annotations.AnnotationApi, "/api/annotations/<name>"),
        (annotations.StreamAnnotations, "/api/download/<filename>"),
        # --- BioSamples (submit routes before accession wildcard) ---
        (biosamples.BioSampleChecklist, "/api/biosamples/checklist"),
        (biosamples.BioSamplesSubmit, "/api/biosamples/submit"),
        (biosamples.BioSampleSubmit, "/api/biosamples/submit/<accession>"),
        (biosamples.BioSampleApi, "/api/biosamples/<accession>"),
        (biosamples.ReadsByBiosample, "/api/biosamples/<accession>/reads"),
        (biosamples.AssembliesByBiosample, "/api/biosamples/<accession>/assemblies"),
        (biosamples.SubSamplesApi, "/api/biosamples/<accession>/sub_samples"),
        # --- Local samples ---
        (local_samples.LocalSampleApi, "/api/local_samples/<local_id>"),
        # --- Read runs (INSDC): experiments list before accession wildcard ---
        (reads.ReadExperimentsApi, "/api/reads/experiments"),
        (reads.ReadApi, "/api/reads/<accession>"),
        # --- Taxons (``/taxons/root`` before ``<taxid>`` so ``root`` is not captured as id) ---
        (taxons.RootTaxonApi, "/api/taxons/root"),
        (taxons.TaxonApi, "/api/taxons/<taxid>"),
        (taxons.TaxonChildrenApi, "/api/taxons/<taxid>/children"),
        (taxons.TaxonAncestoresApi, "/api/taxons/<taxid>/ancestors"),
        (taxons.RelativeTaxonomyTreeApi, "/api/taxons/<taxid>/lookup"),
        # --- Users ---
        (users.UsersApi, "/api/users"),
        (users.UserApi, "/api/users/<name>"),
        (users.UserLookup, "/api/users/<name>/lookup"),
        (users.UserRelatedSpecies, "/api/users/<name>/organisms"),
        (users.UserRelatedSamples, "/api/users/<name>/local_samples"),
        (users.UserSubmittedSamples, "/api/users/<name>/submitted_biosamples"),
    )


def initialize_routes(api) -> None:
    """Register all API resources on the given Flask-RESTful ``Api`` instance."""
    for resource, urls in _rows():
        if isinstance(urls, tuple):
            api.add_resource(resource, *urls)
        else:
            api.add_resource(resource, urls)
