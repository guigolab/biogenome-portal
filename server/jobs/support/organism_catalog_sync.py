"""
Organism catalog ingest support: re-exports from focused sibling modules.

Pipeline overview:
1. Primary model writes (ReadRun, BioSample, Assembly, …).
2. Secondary writes (e.g. ENA BioSample fetch).
3. Taxonomy bootstrap via :func:`handle_full_taxonomy_from_taxids` or
   :func:`jobs.support.catalog_ingest_pipeline.run_phase2_taxonomy_bootstrap`.
4. Denorm / finalize / prune via :func:`finalize_organism_catalog_for_taxids`,
   :func:`reload_prune_denorm_after_taxonomy_import`, and
   :mod:`jobs.support.catalog_ingest_pipeline` helpers.

Implementation is split for maintainability:

- :mod:`jobs.support.organism_catalog_guard` — orphan cleanup (with REST cascade parity),
  batch taxid helpers.
- :mod:`jobs.support.organism_catalog_taxonomy` — ENA taxonomy fetch, Organism/TaxonNode insert.
- :mod:`jobs.support.organism_catalog_finalize` — lineage copy, counters, statuses, GoaT bulk,
  finalize orchestration, read/biosample ingest tail.
- :mod:`jobs.support.catalog_ingest_pipeline` — orchestration API and thin REST sync wrapper.
"""

from __future__ import annotations

from jobs.support.organism_catalog_finalize import (
    NewOrganismsImportResult,
    bulk_apply_goat_report_updates,
    bulk_copy_organism_lineages_to_catalog,
    bulk_update_organism_counts_for_taxids,
    bulk_update_organism_statuses_for_taxids,
    bulk_update_taxon_node_counts_for_keys,
    bulk_update_taxon_node_counts_for_taxids,
    check_species_permission,
    check_user_permission_for_taxid,
    finalize_organism_catalog_for_taxids,
    import_missing_organisms_for_taxids,
    reload_prune_denorm_after_taxonomy_import,
    species_upload_permission_errors,
)
from jobs.support.organism_catalog_guard import (
    TDoc,
    TAXID_LIST_LIMIT,
    delete_rows_without_organism,
    existing_organism_taxids,
    normalize_species_taxids,
    surviving_taxids_after_cleanup,
    taxids_on_catalog_documents,
    union_sorted_species_taxids,
)
from jobs.support.organism_catalog_taxonomy import (
    fetch_new_organisms,
    handle_full_taxonomy_from_taxids,
    parse_taxons_and_organisms_from_ena_browser,
)
from jobs.support.catalog_ingest_pipeline import (
    CatalogIngestPhasesResult,
    finalize_touched_species_catalog,
    reload_prune_denorm_after_primary_import,
    run_phase2_taxonomy_bootstrap,
    sync_species_after_catalog_write,
)

__all__ = [
    "TDoc",
    "TAXID_LIST_LIMIT",
    "CatalogIngestPhasesResult",
    "NewOrganismsImportResult",
    "bulk_apply_goat_report_updates",
    "bulk_copy_organism_lineages_to_catalog",
    "bulk_update_organism_counts_for_taxids",
    "bulk_update_organism_statuses_for_taxids",
    "bulk_update_taxon_node_counts_for_keys",
    "bulk_update_taxon_node_counts_for_taxids",
    "check_species_permission",
    "check_user_permission_for_taxid",
    "delete_rows_without_organism",
    "finalize_touched_species_catalog",
    "existing_organism_taxids",
    "fetch_new_organisms",
    "finalize_organism_catalog_for_taxids",
    "handle_full_taxonomy_from_taxids",
    "import_missing_organisms_for_taxids",
    "normalize_species_taxids",
    "parse_taxons_and_organisms_from_ena_browser",
    "reload_prune_denorm_after_primary_import",
    "reload_prune_denorm_after_taxonomy_import",
    "run_phase2_taxonomy_bootstrap",
    "species_upload_permission_errors",
    "sync_species_after_catalog_write",
    "surviving_taxids_after_cleanup",
    "taxids_on_catalog_documents",
    "union_sorted_species_taxids",
]
