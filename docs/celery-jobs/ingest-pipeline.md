# Catalog ingest pipeline (Celery)

Importers follow a **canonical order** so organism counters, INSDC/GoaT status, and enrichment stay consistent.

## Phases

1. **Fetch** — JSONL/TSV/API data into memory or temp files.
2. **Store** — primary catalog models (Assembly, ReadRun, BioSample, …).
3. **Related fetch** as needed (e.g. ENA BioSample resolution). Assembly import resolves linked biosamples **after** assembly documents are stored; tier-1 metadata still comes from the merged JSONL row when present.
4. **Taxonomy** — `jobs.support.catalog_ingest_pipeline.run_phase2_taxonomy_bootstrap` (ENA organism / taxon nodes).
5. **Organism lineage prune** — `jobs.support.organism_catalog_guard.prune_organisms_missing_taxon_lineage` (scoped to import taxids; deletes only when no dependent catalog rows exist for the species).
6. **Catalog row prune** — `jobs.support.organism_catalog_guard.delete_rows_without_organism` where applicable.
7. **Annotrieve (assembly path)** — when enabled, `GenomeAnnotation` upsert runs **in-process** before finalize, with `skip_finalize=True`, so annotation taxids merge into the single species set below.
8. **Finalize** — Importers typically call `bulk_copy_organism_lineages_to_catalog` for touched species, then `jobs.support.stats.update_organism_counts` / `update_taxon_node_counts`, GoaT-aware status helpers where applicable (e.g. `jobs.support.goat_status.apply_goat_status_after_*_ingest`), and `jobs.support.organism_enrich.run_enrich_followup_for_taxids` for enrichment tails.
9. **Tails** — geolocation, BlobToolKit linking, etc.

## Ordering invariants

- **Status** (`insdc_status`, `goat_status`, …) is derived from per-organism **catalog counts** on each `Organism` document. Refresh counts for touched species in the same worker pass (or immediately before) any bulk status derivation so fields stay consistent.
- **Enrichment** (lineage rank labels, IUCN, images, ToLID) should run after counts (and any status refresh) for the same taxids when an import affects them; avoid racing a separate delayed enrich against an in-flight recount for the same set.
- **Reads / biosample project imports** — use `saved_organism_taxids` from taxonomy bootstrap to scope expensive enrich work to **newly inserted** organisms where appropriate; other touched species still need counts and lineage propagation.
- **Assembly + Annotrieve**: a **single** merged finalize includes species from assemblies, biosamples, new organisms, and annotation taxids so `genome_annotations_count` and status stay aligned.
- **`iucn_force`**: callers that need a forced IUCN refresh pass `iucn_force=True` into `jobs.support.organism_enrich.run_enrich_followup_for_taxids` (see that helper’s keyword args).
- **Taxonomy refresh** (`jobs.taxonomy.refresh_taxonomy_recurrent` → `jobs.support.taxonomy_refresh.execute_taxonomy_refresh_pipeline`): after applying ENA organism updates, runs the same scoped lineage prune on `updated_taxids` before syncing TaxonNode fields, rebuilding TaxonNode edges, and finalizing.

## Manual regression checklist

Use after changes to ingest or catalog denorm code:

1. **Small assembly import** — new assemblies + optional Annotrieve: one async finalize (or chain), organism counts and `genome_annotations_count` sensible; no second redundant finalize for annotations alone.
2. **Reads bioproject import** — finalize + enrich ordering; status fields populated after job completes.
3. **Biosample project import** — same as reads for prune + finalize + chained enrich.
4. **Conflicting status** — grep/logs: no duplicate status passes for the same taxids in parallel with stale counts (avoid parallel enrich vs recount for the same set).

## Re-exports

Common phase entrypoints live on `jobs.support.catalog_ingest_pipeline` (e.g. `run_phase2_taxonomy_bootstrap`, `finalize_touched_species_catalog`).
