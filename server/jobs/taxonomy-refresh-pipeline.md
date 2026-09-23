# Taxonomy refresh pipeline (`helpers_refresh_taxonomy`)

Recurrent job that re-fetches taxonomy from ENA for every organism/taxon already in the
database, detects drift (renames, taxid deprecations/merges, lineage changes, rank/name
corrections), and propagates those changes across `Organism`, `TaxonNode`, and the catalog
collections that mirror species taxonomy (`Assembly`, `BioSample`, `ReadRun`,
`GenomeAnnotation`, `LocalSample`, `SampleCoordinates`).

- **Celery task name**: `helpers_refresh_taxonomy`
- **Entry point**: `jobs.taxonomy.refresh_taxonomy_recurrent(tmp_dir=None)`
- **Implementation**: `jobs.support.taxonomy_refresh.execute_taxonomy_refresh_pipeline(tmp_dir)`
- **Scheduling**: registered under `JOB_MODELS['helpers']['refresh_taxonomy']` in
  `services/cronjob.py`; run on whatever cadence is configured for that job (admin-configurable
  cron, not hard-coded), or triggered manually via the Celery task name.
- **No arguments needed for a normal run** - `tmp_dir` defaults to `$TMP_DIR` or the system tmp dir
  and is only used to stage/delete the gzipped ENA XML files fetched per batch.
- **Not covered by MongoDB transactions.** The DB has no evidence of running as a replica set in
  this codebase, so every write below is a standalone `update_one` / `update_many` / `bulk_write`.
  Ordering and per-change isolation (see "Critical points" below) are what keep a partial failure
  safe to re-run, not atomicity.

## Step-by-step

### 1. Collect taxids to refresh
`collect_taxids_for_refresh()` (read-only)
- `species_taxids`: every `Organism.taxid` in the DB.
- `lineage_taxids`: every taxid appearing in any `Organism.taxon_lineage`, plus every
  `TaxonNode.taxid`.
- `all_taxids = species_taxids | lineage_taxids` is what actually gets sent to ENA.

### 2. Fetch fresh data from ENA (bulk, then per-taxid fallback)
`fetch_fresh_taxonomy_from_ena()` -> `jobs.support.catalog_taxonomy_bootstrap.fetch_new_organisms()`
- Batches `all_taxids` (`TAXID_LIST_LIMIT` = 5000/batch), calls the ENA browser bulk taxonomy XML
  endpoint per batch, parses gzipped XML into in-memory `Organism`-shaped objects (not saved yet)
  and a `taxid -> TaxonNode` dict. Temp XML files are written to `tmp_dir` and deleted after
  parsing (best-effort `os.remove`; a leftover temp file on crash is the only filesystem
  side-effect of this job).
- `_fetch_single_taxon_fallback_for_unmatched()` then finds every DB organism whose **old**
  `taxid` and `scientific_name` are both absent from the bulk response, and retries each
  individually via `helpers.organism.retrieve_taxonomic_info` (ENA browser -> ENA portal -> NCBI
  -> ENA Taxonomy REST). This distinguishes a transient bulk-fetch gap from a real ENA
  deprecation before anything downstream treats the organism as "gone".
- Nothing is written to the DB in this step; it only builds the "fresh" in-memory dataset used
  for comparison.

### 3. Compute per-organism changes
`compute_organism_changes(db_organisms, fresh_organisms)` (read-only, in-memory diff)
- Matches primarily by `taxid`; falls back to matching by (lowercased) `scientific_name` for
  organisms whose old taxid vanished from ENA (deprecated/merged taxon, same name kept).
- Classifies each detected difference as `"scientific_name"`, `"taxid"`, `"both"`, or
  `"lineage_only"`.
- An organism found in neither the bulk fetch nor the single-taxon fallback (old taxid and old
  name both unresolved) is **skipped with a warning log** - nothing is changed or deleted for it.
  This is the "deprecated *and* renamed with no trace left" residual case; it needs manual review.

### 4. Guard against unique-index collisions
`_guard_changes_against_unique_collisions(changes)`
- `Organism.taxid` and `Organism.scientific_name` both carry a MongoDB **unique index**
  (`server/db/model.py`). Applying a change blindly can violate either one and abort a batch
  write (`DuplicateKeyError`) partway through.
- **Taxid collisions**: if a change would remap `taxid` onto a value another Organism already
  owns (e.g. two species merged upstream into one taxon), the change is **skipped entirely** -
  no write happens for that organism this run. Logged as `taxid_collisions_skipped`.
- **Name collisions**: if a change's new `scientific_name` is already owned by a different
  organism (in the DB, or by another change in this same batch), the name is disambiguated with
  the same `" [NCBI:{taxid}]"` suffix convention used at ingest time, instead of being skipped.
  Logged as `name_collisions_disambiguated`.
- This check only knows about *pre-existing* DB documents; it cannot foresee two changes in the
  same batch that both target a **new**, not-yet-existing taxid (a legitimate upstream merge). See
  "Critical points" below for how that case is still handled safely.

### 5. Apply organism-level changes
`apply_organism_updates(changes)` - **writes** `Organism`, then `Assembly` / `BioSample` /
`ReadRun` / `GenomeAnnotation` / `LocalSample` / `SampleCoordinates`
- For each surviving change, **in this order**:
  1. `Organism.update_one` (matched by old taxid) sets `taxid`, `scientific_name`,
     `taxon_lineage`, `insdc_common_name` as needed. `Organism` is updated **first** so it stays
     the authoritative source of truth if step (2) fails partway.
  2. `propagate_organism_changes_to_related([change])` runs `update_many` on each of the six
     catalog collections above, matched by the **old** `taxid` (or by current `taxid` for a
     lineage-only/name-only change), setting `taxid` / `scientific_name` / `taxon_lineage` (or
     `lineage` on `SampleCoordinates`) to the new values.
- Each change is wrapped in its own `try/except`: **one change's failure does not abort the
  rest of the batch.** Failures are collected (`old_taxid`, `new_taxid`, `change_type`, `error`)
  and returned/logged, not raised.
- No document is deleted in this step. Worst case for a failed change: `Organism` already has
  the new taxid/name, but the six catalog collections still carry the old one until the next
  successful run (self-healing on retry, since the pipeline re-diffs from the DB each time).

### 6. Prune organism stubs left without a lineage
`prune_organisms_missing_taxon_lineage(updated_taxids)` (scoped to this run's successfully
updated taxids only) - **can permanently delete `Organism` documents**
- See "Critical points" below - this is the only real-delete step in the whole pipeline.

### 7. Sync TaxonNode intrinsic fields (name/rank) from ENA
`_insert_new_taxon_nodes_from_dict(fresh_taxons)` then
`apply_taxon_node_intrinsic_updates_from_ena(fresh_taxons)` - **inserts/updates `TaxonNode`**
- Inserts any `TaxonNode` present in the fresh ENA payload but missing from the DB (new ancestor
  ranks appearing in a lineage for the first time).
- For nodes already in the DB, `$set`s `name` / `rank` when ENA's value differs. Runs
  **unconditionally** over every taxon fetched this run (not gated on there being an
  organism-level change), so a pure higher-taxon rename/rank fix from ENA (e.g. a family renamed
  with zero affected species) is never silently dropped.

### 8. Rebuild TaxonNode `parent` / `children` edges
`rebuild_taxon_node_edges_for_organisms(fresh_taxons, updated_taxids, old_lineage_taxids)` -
**updates `TaxonNode`** (only runs if at least one organism was actually updated in step 5)
- Loads the (already-updated) `Organism.taxon_lineage` for every touched species and calls
  `catalog_denorm_finalize.sync_taxonnode_edges_from_organism_lineages`, which `$set`s `parent`
  and `$addToSet`s `children` for every consecutive pair in each lineage chain.
- Then `_rebuild_children_for_touched_nodes(touched)` **overwrites** (`$set`, not `$addToSet`)
  the `children` array for every node in `old_lineage_taxids | new_lineage_taxids`, recomputed
  from scratch by scanning `Organism.taxon_lineage`. This is what removes a stale edge to a
  child that moved to a different parent (`$addToSet` alone only ever adds edges, never removes
  them).

### 9. Refresh `lineage_rank_labels`
`jobs.support.taxonomy.sync_backfill_organism_lineage_rank_labels_for_taxids(updated_taxids)` -
**updates `Organism.lineage_rank_labels`** for touched species only.

### 10. Refresh catalog counters
`update_organism_counts(updated_taxids)`, `update_taxon_node_counts(updated_taxids)`,
`refresh_taxon_node_counts_for_lineage_keys(old_lineage_taxids)` - **updates `Organism`
count fields and `TaxonNode` count fields**
- Recomputes `assemblies_count` / `reads_count` / `biosamples_count` / `local_samples_count` /
  `genome_annotations_count` on touched `Organism` rows, and the same five plus
  `organisms_count` on every `TaxonNode` reachable from the **old** lineage (nodes that may have
  lost a descendant) as well as the **new** one. No INSDC/GoaT status recompute happens here.

## DB rows touched

| Collection | Read | Insert | Update | Delete |
|---|---|---|---|---|
| `Organism` | yes (diff source) | no | taxid / scientific_name / taxon_lineage / insdc_common_name (step 5); lineage_rank_labels (step 9); 5 count fields (step 10) | **yes, step 6** - see below |
| `TaxonNode` | yes (edge/count rebuild) | yes, step 7 (new ancestor nodes) | name / rank (step 7); parent / children (step 8); 6 count fields (step 10) | no |
| `Assembly` | no | no | taxid / scientific_name / taxon_lineage (step 5) | no |
| `BioSample` | no | no | taxid / scientific_name / taxon_lineage (step 5) | no |
| `ReadRun` | no | no | taxid / scientific_name / taxon_lineage (step 5) | no |
| `GenomeAnnotation` | no | no | taxid / scientific_name / taxon_lineage (step 5) | no |
| `LocalSample` | no | no | taxid / scientific_name / taxon_lineage (step 5) | no |
| `SampleCoordinates` | no | no | taxid / scientific_name / lineage (step 5) | no |

This job never touches `BioProject`, `Chromosome`, `Read`, `Experiment`, `LocalAssembly`,
`BioSampleFetchFailure`, `OrganismPrincipal`, or `BioGenomeUser`.

## Critical points: what can delete rows or drop data

1. **`prune_organisms_missing_taxon_lineage` (step 6) is the only hard delete.**
   `jobs/support/catalog_ingest_guard.py`. After applying changes, the pipeline calls this
   scoped to `updated_taxids` (the taxids just written in step 5) - it deletes an `Organism`
   document **only if** (a) `taxon_lineage` is missing/`None`/`[]` **and** (b) no `Assembly`,
   `BioSample`, `ReadRun`, `LocalSample`, or `GenomeAnnotation` row references that taxid. This
   is meant to clean up organism stubs that a taxid remap turned lineage-less (e.g. ENA served a
   fresh row without a resolvable lineage). In practice this should be rare and self-limiting
   (species with real catalog data are always protected), but it is a genuine, permanent
   `Organism.delete()` with no soft-delete/undo path. If ENA ever returns an organism payload
   with an empty lineage for a taxid that legitimately has no catalog rows yet (e.g. a very
   recently registered species with no assemblies), that stub organism would be removed.

2. **Taxid collision skip (step 4) silently leaves an organism un-migrated, indefinitely.**
   If ENA reports a species taxid that now collides with another organism's current taxid (an
   upstream merge/synonymization), the whole change is skipped - not just the `Organism.taxid`
   field, but also `scientific_name` and `taxon_lineage` for that same change, even if only the
   taxid part was the problem. The organism is left exactly as before, and the guard runs again
   (and skips again) on every future run until someone manually resolves the merge. No data is
   deleted, but drift accumulates silently (only a `WARNING` log per run) until noticed.

3. **Same-batch taxid collisions are not caught by the guard, only by the per-change try/except
   in step 5.** Two different old organisms can both legitimately resolve to the same *new*
   taxid in one run (the guard in step 4 only checks against taxids that already exist in the
   DB, not against sibling changes in the same run). The first `Organism.update_one` to claim
   the new taxid succeeds; the second hits a real unique-index `DuplicateKeyError`, which is
   caught and recorded as a failure (not raised). No data is lost, but exactly one of the two
   merged species "wins" the new taxid for that run (whichever is processed first, order not
   guaranteed), and the loser needs a subsequent run (or manual fix) to reconcile.

4. **`_rebuild_children_for_touched_nodes` (step 8) does a full `$set` overwrite of
   `TaxonNode.children`, not an incremental add.** It is deliberately corrective (so a child
   that moved to a different parent is actually removed from the old parent's `children`), but
   that also means a bug in the touched-taxid set, or an unexpected gap in the
   `Organism.taxon_lineage` data it scans, would **replace** `children` with an incomplete list
   rather than merely fail to add to it. This method only touches `children`, never `parent` or
   any other `TaxonNode` field, and only ever runs for nodes in
   `old_lineage_taxids | new_lineage_taxids` for **this run's** changes - nodes outside that set
   are never touched.

5. **Organisms unresolved by both bulk ENA and the single-taxon fallback are left untouched,
   not deleted** (step 2/3). If a taxon was deprecated *and* renamed in the same ENA update with
   no trace under the old taxid or old name, `compute_organism_changes` logs a warning and moves
   on. The stale `Organism` document (and its catalog rows) remain exactly as they were
   indefinitely; this pipeline has no mechanism to flag or quarantine them beyond the log line.

6. **No cross-collection transaction.** If the process is killed between step 5's `Organism`
   write and its catalog `update_many` calls (or between any two steps), the DB is left with
   `Organism` already updated but some catalog rows still on the old `taxid` /
   `scientific_name` / `taxon_lineage`. This is expected to **self-heal on the next run**
   because `compute_organism_changes` always re-diffs from the current DB state - it is not a
   permanent inconsistency, but a dashboard/API read in between two runs can show a mismatched
   organism vs. catalog-row taxonomy for that species.

7. **`insdc_common_name` can be reset to `None`.** In step 5, `apply_organism_updates` always
   `$set`s `insdc_common_name` from the fresh ENA payload, including to `None` if ENA has no
   common name for that taxid. If a common name was previously entered manually or by another
   source and ENA does not carry one, this pipeline overwrites it with `None` on the next
   detected change for that organism (only when some other field also changed - it is not
   rewritten if the organism otherwise has no detected change).

## Related jobs in `jobs/taxonomy.py` (adjacent, not part of this pipeline)

Two other Celery tasks live in the same module and are worth knowing about since they also
touch taxonomy data, including one outright bulk-delete job:

- **`helpers_unset_taxon_node_legacy_fields`** (`unset_taxon_node_legacy_fields`) - `$unset`s
  legacy `TaxonNode.leaves` / `submitted_biosamples_count` fields, then backfills
  `TaxonNode.parent`/`children` from every `Organism.taxon_lineage`. No deletes.
- **`helpers_cleanup_catalog_outside_root_lineage`** (`cleanup_catalog_outside_root_lineage`) -
  **bulk-deletes** every `Assembly` (+ related `Chromosome` rows), `ReadRun`, `BioSample`,
  `Organism`, and `GenomeAnnotation` document whose `taxon_lineage` does **not** contain
  `ROOT_NODE` (env var, required). This is a real, unscoped mass-delete across five collections
  driven entirely by a single env var comparison - misconfiguring `ROOT_NODE` (wrong value,
  unset in the wrong environment, or run against the wrong portal's root taxon) would delete the
  **entire catalog** for that portal. It is unrelated to the taxonomy refresh pipeline above and
  is not invoked by it.

## Idempotency summary

Re-running this pipeline with no upstream ENA changes is a no-op: `compute_organism_changes`
finds nothing to change, `apply_taxon_node_intrinsic_updates_from_ena` finds no name/rank drift,
and the edge/counter rebuild steps only run when `updated_taxids` is non-empty. This makes it
safe to re-run after a partial failure (see point 6 above) or on a fixed schedule without manual
reconciliation, aside from the two silently-persistent cases in points 2 and 5 above, which
require operator intervention.

## Return value (observability)

`execute_taxonomy_refresh_pipeline` returns a dict logged and surfaced to the caller:

```text
organisms_updated               - Organism documents successfully updated (step 5)
taxids_changed                  - subset of the above where taxid itself changed
species_fetched                 - len(species_taxids) considered this run
taxon_nodes_fields_updated      - TaxonNode name/rank corrections applied (step 7)
taxid_collisions_skipped        - changes skipped due to a pre-existing taxid collision (point 2)
name_collisions_disambiguated   - scientific_name values suffixed to avoid a collision
changes_failed                  - changes whose Organism/catalog write raised (step 5)
fallback_taxids_attempted       - taxids retried via single-taxon providers (step 2)
fallback_taxids_resolved        - of those, how many were successfully resolved
taxon_nodes_recounted           - TaxonNode rows whose catalog counters were refreshed (step 10)
lineage_rank_labels_refreshed   - organisms whose lineage_rank_labels were refreshed (step 9)
```
