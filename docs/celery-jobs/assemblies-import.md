# Celery job: assemblies import (`jobs/assemblies.py`)

Reference for agents: end-to-end behavior, data flow, files, and MongoDB models.

## Entry points

| Symbol | Celery name | Role |
|--------|-------------|------|
| `import_assemblies_by_bioproject` | `assemblies_import` | NCBI `datasets` CLI: bioproject → JSONL → shared pipeline |
| `import_assemblies_from_accessions` | `accessions_import` | Same pipeline from explicit assembly accession list (batched 1000) |

---

## Environment and configuration

| Variable | Used for |
|----------|----------|
| `PROJECT_ACCESSION` | Default bioproject for `import_assemblies_by_bioproject` |
| `TMP_DIR` | JSONL, batch `.txt` inputs, biosample XML, taxonomy XML |

---

## Shared core: `_run_assembly_import_pipeline(jsonl_paths, context_label)`

All assembly ingest funnels through this function.

### Purpose

Ingest **NCBI Datasets** JSONL assembly records: ensure **organisms** and **taxon nodes**, optionally **biosamples**, **insert/update assemblies**, **chromosomes**, prune orphans, **finalize** catalog denorm (lineages + counts + statuses), **geolocate** new biosamples, **BlobToolKit** links, async **ToLID**.

### Why assemblies do not use `reload_prune_denorm_after_taxonomy_import`

That helper assumes **one** catalog model + **one** id field + a list of import ids (read runs or biosample accessions). The assembly job:

- Prunes **`Assembly`** by `accession` list and **`BioSample`** by fetched accession list **separately** (already done before finalize).
- Builds **`species_to_refresh`** from taxids on surviving saved assembly rows only (simplicity-first scope for this pipeline).

So it calls **`finalize_organism_catalog_for_taxids(species_to_refresh, copy_lineages=True)`** directly.

---

## Step-by-step (`_run_assembly_import_pipeline`)

1. **Empty JSONL paths** → return stub dict (`status: no_jsonl`, empty lists).
2. **Merge JSONL** — `jobs.support.assembly_jsonl.merge_assembly_jsonl_rows_from_paths`:
   - Reads each line as JSON; keys by `accession`.
   - Compares to `Assembly.objects().scalar("accession")`.
   - Returns `new_rows` (not in DB) and `assemblies_to_update` (existing accession → full record for metadata refresh).
3. **Taxids** — `collect_taxids_from_assembly_rows` from both structures (`organism.tax_id` in JSON).
4. **Taxonomy** — `handle_full_taxonomy_from_taxids(all_taxids, TMP_DIR)` → **`saved_organism_taxids`** (new inserts only).
5. **Gate** — `taxids_with_organism` = distinct taxids among JSONL taxids that have an **`Organism`** document.
6. **Biosample accessions** — `collect_sample_accessions_for_taxids` from rows whose taxid ∈ `taxids_with_organism`; deduped list.
7. **Fetch biosamples** — `handle_biosamples_from_accessions` (same as reads job) → **`BioSample`** inserts; list `newly_fetched_biosample_accessions`.
8. **Persist assemblies** — `persist_assembly_import_payload(new_rows, assemblies_to_update, taxids_with_organism=...)`:
   - Updates **metadata** on existing assemblies (if taxon allowed).
   - Parses new rows with `parsers.assembly.parse_assembly_from_ncbi_datasets` → **`Assembly`** insert (or per-doc save on bulk failure).
   - **`save_chromosomes_bulk_and_update_assemblies(new_accessions)`**: async HTTP to NCBI assembly reports (`clients.ncbi_assembly_http`, `aiohttp`), **`Chromosome`** delete-by-assembly + insert, **`Assembly.chromosomes`** list updated.
9. **Prune assemblies** — `delete_rows_without_organism(Assembly, "accession", saved_assembly_accessions)` if any saved.
10. **Prune biosamples** — if biosamples fetched: `delete_rows_without_organism(BioSample, "accession", newly_fetched_biosample_accessions)`.
11. **Species refresh set** — distinct `taxid` values on surviving `Assembly` rows for `saved_assembly_accessions`.
12. **Finalize** — `finalize_organism_catalog_for_taxids(species_to_refresh, copy_lineages=True)`:
    - `bulk_copy_organism_lineages_to_catalog` → **TaxonNode** edges + **BioSample** / **Assembly** / **ReadRun** `taxon_lineage` by `taxid`.
    - Organism five counters; TaxonNode roll-ups; `insdc_status` / `goat_status` / `GoaTUpdateDate`.
13. **Geolocation** — `update_geolocations(newly_fetched_biosample_accessions)` if non-empty.
14. **ToLID** — `fetch_tolid_prefixes_task.delay(saved_organism_taxids)` if non-empty.
15. **BlobToolKit** — for `saved_assembly_accessions` still missing `blobtoolkit_id`: `bulk_link_blobtoolkit_for_assembly_accessions` (`clients.genomehubs_client`).
16. **Return** dict with accessions lists, organism taxids, blob stats, `status: ok`.

---

## Task: `import_assemblies_by_bioproject`

1. Resolve `project_accession`; path `{TMP_DIR}/{project_accession}.jsonl`.
2. **`clients.ncbi_client.query_datasets_to_file`** with argv roughly: `genome accession <PRJ> --assembly-source GenBank --as-json-lines`.
3. `_run_assembly_import_pipeline([jsonl_path], context_label=...)`.
4. Delete JSONL in `finally`.

---

## Task: `import_assemblies_from_accessions`

1. Dedupe/strip accessions; batch size **1000**.
2. Per batch: write `.txt` accession list, run `query_datasets_to_file` with `--inputfile` → `.jsonl`.
3. Merge all successful JSONL paths into one pipeline call.
4. Delete temp `.txt` / `.jsonl` in `finally`.

---

## Data flow diagram

```mermaid
flowchart TB
  subgraph ncbi [NCBI]
    DS[datasets CLI JSONL]
    REP[assembly reports TSV]
  end
  subgraph ena [ENA]
    TX[taxonomy XML]
    BS[biosample XML]
  end
  subgraph mongo [MongoDB]
    ASM[Assembly]
    CHR[Chromosome]
    BSMP[BioSample]
    ORG[Organism]
    TN[TaxonNode]
    RR[ReadRun]
    GA[GenomeAnnotation]
    LS[LocalSample]
  end

  DS --> ASM
  DS --> REP --> CHR
  CHR --> ASM
  TX --> ORG
  TX --> TN
  BS --> BSMP
  ORG -->|finalize lineage| ASM
  ORG -->|finalize lineage| BSMP
  ORG -->|finalize lineage| RR
  ORG -->|counts status| ORG
  ORG --> TN
  GA -.->|count agg only| ORG
```

---

## MongoDB models touched

| Model | Operation |
|-------|-----------|
| **Assembly** | insert, metadata update, `chromosomes` / `blobtoolkit_id` update, `taxon_lineage` set, orphan delete |
| **Chromosome** | delete by `metadata.assembly_accession`, insert new molecules |
| **BioSample** | insert (ENA), orphan delete, `taxon_lineage` update |
| **Organism** | insert (taxonomy); update counters, statuses, countries (geo); read |
| **TaxonNode** | insert (taxonomy); parent/children; rollup counts |
| **ReadRun** | `taxon_lineage` update only (by taxid) during finalize |
| **GenomeAnnotation** | aggregation-only for organism `genome_annotations_count` / taxon rollups |
| **LocalSample** | aggregation-only |
| **GoaTUpdateDate** | upsert when GoaT inference fires |

---

## File dependency tree (nested)

```
jobs/assemblies.py
├── clients/ncbi_client.py         → query_datasets_to_file (subprocess datasets CLI)
├── db/model.py                    → Assembly, BioSample, Organism
├── helpers/data.py                → create_batches (1000 accession batches)
├── helpers/job_paths.py
├── jobs/organisms.py              → fetch_tolid_prefixes_task
├── jobs/support/assembly_jsonl.py → bulk_link_blobtoolkit_for_assembly_accessions
│   ├── clients/genomehubs_client.py
│   └── db/model.py              → Assembly
├── jobs/support/assembly_jsonl.py
│   ├── parsers/assembly.py      → parse_assembly_from_ncbi_datasets
│   ├── clients/ncbi_assembly_http.py → report URLs, streaming lines
│   ├── aiohttp                  → concurrent report fetch
│   └── db/model.py              → Assembly, Chromosome
├── jobs/support/biosample_bulk.py → (same tree as reads doc)
├── jobs/support/geolocation_batch.py
└── jobs/support/organism_catalog_sync.py → handle_full_taxonomy_from_taxids, delete_rows_without_organism, finalize_organism_catalog_for_taxids
    └── (same denorm subtree as reads doc)
```

---

## Failure and edge cases

- No usable JSONL rows → `RuntimeError`.
- `datasets` returns no file → `RuntimeError` (bioproject) or batch skipped (accession import) with possible `no_output` return.
- Chromosome fetch failure per assembly → logged; existing chromosomes may be left unchanged for that accession.
- Bulk assembly insert failure → fallback per-document save/update.
