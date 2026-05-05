import logging
import os
import uuid
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from celery import shared_task
from mongoengine.queryset.visitor import Q

from clients.ncbi_client import query_datasets_to_file
from db.constants import GOAT_PROJECT_NAME
from db.model import Assembly, BioSample
from helpers.assembly import CHROMOSOME_REPORT_ASSEMBLY_LEVELS
from helpers.data import create_batches
from helpers.job_paths import ensure_parent_dir, safe_remove_file
from jobs.support.catalog_ingest_guard import (
    delete_rows_without_organism,
    prune_organisms_missing_taxon_lineage,
)
from jobs.support.assembly_jsonl import (
    bulk_link_blobtoolkit_for_assembly_accessions,
    run_assembly_import_merge_persist_bounded,
    save_chromosomes_bulk_and_update_assemblies,
)
from jobs.support.catalog_taxonomy_bootstrap import handle_full_taxonomy_from_taxids
from jobs.support.biosample_ingest import resolve_biosamples_for_accessions
from jobs.support.geolocation_batch import update_geolocations
from jobs.support.ingest_job_utils import dedupe_nonempty_strs, scalar_taxids_batched
from jobs.support.annotrieve import sync_annotrieve_annotations_for_assembly_accessions
from jobs.support.catalog_denorm_finalize import bulk_copy_organism_lineages_to_catalog
from jobs.support.stats import update_organism_counts, update_taxon_node_counts
from jobs.support.organism_enrich import run_enrich_followup_for_taxids
from jobs.support.goat_status import apply_goat_status_after_assembly_ingest
from jobs.taxonomy import cleanup_catalog_outside_root_lineage
logger = logging.getLogger(__name__)

PROJECT_ACCESSION = os.getenv("PROJECT_ACCESSION")
TMP_DIR = os.getenv("TMP_DIR", "/tmp")
IMPORT_BLOBTOOLKIT = os.getenv("IMPORT_BLOBTOOLKIT", "true")


def _write_accession_batch(path: str, batch: List[str]) -> None:
    """Write one NCBI assembly accession per line for datasets --inputfile."""
    with open(path, "w", encoding="utf-8") as f:
        f.write("\n".join(batch))
        if batch:
            f.write("\n")


def _run_assembly_import_pipeline(
    jsonl_paths: List[str],
    *,
    context_label: str,
) -> Dict[str, Any]:
    """
    Shared flow (bioproject + accession list imports) — canonical phases:

    1. **Fetch/merge** JSONL rows; collect taxids and biosample accessions from rows.
    2. **Store** assemblies; then resolve linked biosamples (tier-1 JSONL → ENA…).
    3. **Taxonomy** bootstrap; **prune** organisms without usable ``taxon_lineage`` (guarded).
    4. **Catalog prune** of rows without Organism; optional **inline Annotrieve** (skip its finalize).
    5. **Finalize** one merged species set (counts + INSDC/GoaT + enrich chain for new organisms).
    6. **Geolocation**; **BlobToolKit** link; launch chromosome-refetch follow-up task.
    """
    if not jsonl_paths:
        return {
            "saved_assembly_accessions": [],
            "saved_biosample_accessions": [],
            "saved_organism_taxids": [],
            "blobtoolkit_updated": 0,
            "blobtoolkit_no_hit": 0,
            "blobtoolkit_api_errors": 0,
            "status": "no_jsonl",
        }

    sqlite_staging = os.path.join(TMP_DIR, f"assembly_import_{uuid.uuid4().hex}.sqlite")
    ensure_parent_dir(sqlite_staging)
    try:
        merged = run_assembly_import_merge_persist_bounded(
            jsonl_paths,
            sqlite_staging,
            taxids_with_organism=None,
        )
    finally:
        safe_remove_file(sqlite_staging)

    if merged.staging_accession_count == 0:
        raise RuntimeError(
            f"{context_label}: JSONL contained no usable assembly rows (empty or invalid)."
        )

    all_taxids = merged.all_taxids
    if not all_taxids:
        logger.warning("%s: no taxids found in assembly JSONL rows.", context_label)

    assembly_biosample_accessions = merged.assembly_biosample_accessions
    saved_assembly_accessions = merged.saved_assembly_accessions

    newly_fetched_biosample_accessions: List[str] = []
    if assembly_biosample_accessions:
        assembly_row_by_biosample = merged.assembly_row_by_biosample
        related_id_by_biosample = {
            acc: (assembly_row_by_biosample[acc].get("accession") or "")
            for acc in assembly_biosample_accessions
            if acc in assembly_row_by_biosample
        }
        newly_fetched_biosample_accessions = resolve_biosamples_for_accessions(
            assembly_biosample_accessions,
            TMP_DIR,
            assembly_by_biosample=assembly_row_by_biosample,
            related_kind="Assembly",
            related_id_by_biosample=related_id_by_biosample,
        )

    saved_organism_taxids = handle_full_taxonomy_from_taxids(list(all_taxids), TMP_DIR)
    prune_organisms_missing_taxon_lineage(list(all_taxids))

    if not saved_assembly_accessions:
        logger.warning(
            "%s: no new assemblies were inserted (gates or empty result).",
            context_label,
        )

    # Remove bad rows before lineage reload so we do not bulk-update documents we are about to delete.
    assembly_accessions_still_in_db: List[str] = []
    if saved_assembly_accessions:
        removed_assemblies = delete_rows_without_organism(
            Assembly, "accession", saved_assembly_accessions
        )
        if removed_assemblies:
            logger.info(
                "%s: removed %s assembly/assemblies with no Organism after import",
                context_label,
                removed_assemblies,
            )
        # Re-resolve accessions so Annotrieve / BlobToolKit / metrics never target deleted rows.
        assembly_accessions_still_in_db = dedupe_nonempty_strs(
            Assembly.objects(accession__in=saved_assembly_accessions).scalar("accession")
        )
        sync_annotrieve_annotations_for_assembly_accessions(assembly_accessions_still_in_db, skip_finalize=True)
    
    if newly_fetched_biosample_accessions:
        delete_rows_without_organism(
            BioSample, "accession", newly_fetched_biosample_accessions
        )

    species_from_assemblies: Set[str] = {
        str(t)
        for t in Assembly.objects(
            accession__in=assembly_accessions_still_in_db
        ).scalar("taxid")
        if t is not None and str(t).strip()
    }
    species_from_biosamples: Set[str] = scalar_taxids_batched(
        BioSample,
        "accession",
        newly_fetched_biosample_accessions,
        batch_size=5000,
    )
    species_to_refresh = sorted(
        species_from_assemblies
        | species_from_biosamples
        | {str(t) for t in saved_organism_taxids if t}
    )

    if species_to_refresh:
        bulk_copy_organism_lineages_to_catalog(species_to_refresh)
        update_organism_counts(species_to_refresh)
        update_taxon_node_counts(species_to_refresh)
        if (GOAT_PROJECT_NAME or "").strip():
            apply_goat_status_after_assembly_ingest(species_to_refresh)
        run_enrich_followup_for_taxids(species_to_refresh)

    if newly_fetched_biosample_accessions:
        update_geolocations(newly_fetched_biosample_accessions)
    
    blob_stats = dict()
    if IMPORT_BLOBTOOLKIT == "true":
        blob_stats = {
            "blobtoolkit_updated": 0,
            "blobtoolkit_no_hit": 0,
            "blobtoolkit_api_errors": 0,
        }
        if assembly_accessions_still_in_db:
            still_present = list(
                Assembly.objects(
                    accession__in=assembly_accessions_still_in_db,
                    blobtoolkit_id=None,
                ).scalar("accession")
            )
            if still_present:
                blob_stats = bulk_link_blobtoolkit_for_assembly_accessions(still_present)
    followup_task_id = None
    try:
        followup = refetch_chromosome_reports_for_empty_chromosomes.delay()
        followup_task_id = followup.id
        logger.info(
            "%s: launched chromosome refetch follow-up task id=%s",
            context_label,
            followup_task_id,
        )
    except Exception:
        logger.exception(
            "%s: failed to launch chromosome refetch follow-up task",
            context_label,
        )
    cleanup_result = cleanup_catalog_outside_root_lineage()

    return {
        "saved_assembly_accessions": assembly_accessions_still_in_db,
        "saved_biosample_accessions": newly_fetched_biosample_accessions,
        "saved_organism_taxids": saved_organism_taxids,
        "status": "ok",
        "chromosome_refetch_task_id": followup_task_id,
        "root_lineage_cleanup": cleanup_result,
        **blob_stats,
    }


@shared_task(name="assemblies_refetch_chromosome_reports", ignore_result=False)
def refetch_chromosome_reports_for_empty_chromosomes(
    limit: Optional[int] = None,
    skip: int = 0,
) -> Dict[str, Any]:
    """
    Re-fetch NCBI assembly reports for assemblies that have no ``chromosomes`` list yet
    but are Complete Genome or Chromosome level (same gate as import / REST). Used to
    recover from transient FTP failures (e.g. 503) during bulk import.
    """
    if skip < 0:
        raise ValueError("skip must be >= 0")
    if limit is not None and limit < 0:
        raise ValueError("limit must be >= 0 when set")

    empty_list = Q(chromosomes__size=0) | Q(chromosomes__exists=False)
    level_in = Q(
        metadata__assembly_info__assembly_level__in=list(
            CHROMOSOME_REPORT_ASSEMBLY_LEVELS
        )
    )
    base_qs = Assembly.objects(empty_list & level_in).only("accession", "assembly_name")
    total_matched = base_qs.count()
    slice_qs = base_qs
    if skip:
        slice_qs = slice_qs.skip(skip)
    if limit is not None:
        slice_qs = slice_qs.limit(limit)
    items: List[Tuple[str, Optional[str]]] = [
        (str(a.accession), a.assembly_name) for a in slice_qs if a.accession
    ]
    if items:
        save_chromosomes_bulk_and_update_assemblies(items)
    return {
        "status": "ok",
        "matched_total": total_matched,
        "queued_for_fetch": len(items),
        "skip": skip,
        "limit": limit,
    }


@shared_task(name="assemblies_import", ignore_result=False)
def import_assemblies_by_bioproject(project_accession: Optional[str] = None) -> Dict[str, Any]:
    """
    Download project JSONL, then run ``_run_assembly_import_pipeline`` (assemblies → biosamples
    → taxonomy → orphan prune with cascades → finalize all touched species → geolocation / enrich).
    """
    if not project_accession:
        project_accession = PROJECT_ACCESSION
    if not project_accession:
        raise ValueError(
            "project_accession is required (argument or PROJECT_ACCESSION env var)."
        )

    jsonl_file_path = os.path.join(TMP_DIR, f"{project_accession}.jsonl")
    ensure_parent_dir(jsonl_file_path)

    try:
        cmd = [
            "genome",
            "accession",
            project_accession,
            "--assembly-source",
            "GenBank",
            "--as-json-lines",
        ]
        output_path = query_datasets_to_file(cmd, jsonl_file_path)
        if not output_path:
            raise RuntimeError(
                f"NCBI datasets CLI returned no data for bioproject {project_accession!r} "
                "(check project accession and datasets installation)."
            )

        result = _run_assembly_import_pipeline(
            [jsonl_file_path],
            context_label=f"bioproject {project_accession}",
        )

        logger.info(
            "Bioproject %s import finished: %s new assemblies inserted, biosamples/geolocation updated.",
            project_accession,
            len(result["saved_assembly_accessions"]),
        )
        return {
            "project_accession": project_accession,
            "assemblies_saved": len(result["saved_assembly_accessions"]),
            "status": result["status"],
        }
    except Exception:
        logger.exception("import_assemblies_by_bioproject failed for %s", project_accession)
        raise
    finally:
        safe_remove_file(jsonl_file_path)


@shared_task(name="accessions_import", ignore_result=False)
def import_assemblies_from_accessions(
    accessions: Iterable[str],
) -> Dict[str, Any]:
    if not accessions:
        raise ValueError("No accessions provided")

    # Collapse duplicates (same as reads: many jobs pass redundant accessions); merge also
    # dedupes per JSONL, but this avoids duplicate datasets calls and duplicate JSONL rows.
    accessions_list = dedupe_nonempty_strs(accessions)
    logger.info("Assemblies to fetch: %s (unique)", len(accessions_list))
    if os.getenv("DEV") == "true":
        accessions_list = accessions_list[:100]
    batches = create_batches(accessions_list, 1000)
    temp_paths: List[str] = []
    output_files_paths: List[str] = []

    try:
        for idx, batch in enumerate(batches):
            assembly_input_file = os.path.join(
                TMP_DIR, f"assemblies_{idx}_{len(batch)}.txt"
            )
            assembly_output_file = os.path.join(
                TMP_DIR, f"assemblies_{idx}_{len(batch)}.jsonl"
            )
            temp_paths.extend([assembly_input_file, assembly_output_file])
            ensure_parent_dir(assembly_input_file)

            try:
                _write_accession_batch(assembly_input_file, batch)
            except OSError as exc:
                logger.error(
                    "Failed to write accession batch file %s: %s",
                    assembly_input_file,
                    exc,
                )
                raise RuntimeError(
                    f"Could not write temporary accession file: {assembly_input_file}"
                ) from exc

            args = [
                "genome",
                "accession",
                "--inputfile",
                assembly_input_file,
                "--as-json-lines",
            ]
            output_path = query_datasets_to_file(args, assembly_output_file)
            if not output_path:
                logger.warning(
                    "No datasets output for batch index %s (size %s); stderr may be in logs.",
                    idx,
                    len(batch),
                )
                continue
            output_files_paths.append(output_path)

        if not output_files_paths:
            logger.warning(
                "import_assemblies_from_accessions: no JSONL produced from %s batches.",
                len(batches),
            )
            return {
                "batches": len(batches),
                "assemblies_saved": 0,
                "status": "no_output",
            }

        result = _run_assembly_import_pipeline(
            output_files_paths,
            context_label="accessions_import",
        )

        logger.info(
            "Accession import finished: %s new assemblies inserted.",
            len(result["saved_assembly_accessions"]),
        )
        return {
            "batches": len(batches),
            "assemblies_saved": len(result["saved_assembly_accessions"]),
            "status": result["status"],
        }
    except Exception:
        logger.exception("import_assemblies_from_accessions failed")
        raise
    finally:
        for path in temp_paths:
            safe_remove_file(path)
