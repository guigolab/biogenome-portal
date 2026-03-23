import logging
import os
from typing import Any, Dict, Iterable, List, Optional, Set

from celery import shared_task

from clients.ncbi_client import query_datasets_to_file
from db.model import Assembly, BioSample, Organism
from helpers.data import create_batches
from helpers.job_paths import ensure_parent_dir, safe_remove_file
from jobs.support.organism_catalog_sync import (
    delete_rows_without_organism,
    finalize_organism_catalog_for_taxids,
    handle_full_taxonomy_from_taxids,
)
from jobs.support.assembly_jsonl import (
    bulk_link_blobtoolkit_for_assembly_accessions,
    collect_sample_accessions_for_taxids,
    collect_taxids_from_assembly_rows,
    merge_assembly_jsonl_rows_from_paths,
    persist_assembly_import_payload,
)
from jobs.support.biosample_bulk import handle_biosamples_from_accessions
from jobs.support.geolocation_batch import update_geolocations
from jobs.organisms import fetch_tolid_prefixes_task

logger = logging.getLogger(__name__)

PROJECT_ACCESSION = os.getenv("PROJECT_ACCESSION")
TMP_DIR = os.getenv("TMP_DIR", "/tmp")


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
    Shared flow (bioproject + accession list imports):

    1. Primary model: parse/persist assemblies (+ chromosomes).
    2. Secondary model: fetch linked biosamples when present.
    3. Taxonomy bootstrap: create/fetch organisms for touched taxids.
    4. Related updates: prune, finalize, geolocation, async ToLID, BlobToolKit.
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

    new_rows, assemblies_to_update = merge_assembly_jsonl_rows_from_paths(jsonl_paths)
    if not new_rows and not assemblies_to_update:
        raise RuntimeError(
            f"{context_label}: JSONL contained no usable assembly rows (empty or invalid)."
        )

    all_taxids = collect_taxids_from_assembly_rows(new_rows, assemblies_to_update)
    if not all_taxids:
        logger.warning("%s: no taxids found in assembly JSONL rows.", context_label)

    saved_organism_taxids = handle_full_taxonomy_from_taxids(list(all_taxids), TMP_DIR)

    # Species that have an Organism among JSONL taxids (string-normalised). Gates assembly writes.
    taxids_with_organism: Set[str] = {
        str(t) for t in Organism.objects(taxid__in=list(all_taxids)).scalar("taxid") if t
    }

    assembly_biosample_accessions = collect_sample_accessions_for_taxids(
        new_rows, assemblies_to_update, taxids_with_organism
    )

    newly_fetched_biosample_accessions: List[str] = []
    if assembly_biosample_accessions:
        newly_fetched_biosample_accessions = handle_biosamples_from_accessions(
            assembly_biosample_accessions, TMP_DIR
        )

    saved_assembly_accessions = persist_assembly_import_payload(
        new_rows,
        assemblies_to_update,
        taxids_with_organism=taxids_with_organism,
    )

    if not saved_assembly_accessions:
        logger.warning(
            "%s: no new assemblies were inserted (gates or empty result).",
            context_label,
        )

    # Remove bad rows before lineage reload so we do not bulk-update documents we are about to delete.
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

    if newly_fetched_biosample_accessions:
        delete_rows_without_organism(
            BioSample, "accession", newly_fetched_biosample_accessions
        )

    # Simplicity-first: refresh only species taxids on surviving saved assemblies.
    species_to_refresh = sorted(
        {
            str(t)
            for t in Assembly.objects(accession__in=saved_assembly_accessions).scalar("taxid")
            if t is not None and str(t).strip()
        }
    )

    if species_to_refresh:
        finalize_organism_catalog_for_taxids(species_to_refresh, copy_lineages=True)

    if newly_fetched_biosample_accessions:
        update_geolocations(newly_fetched_biosample_accessions)

    if saved_organism_taxids:
        fetch_tolid_prefixes_task.delay(list(saved_organism_taxids))

    blob_stats = {
        "blobtoolkit_updated": 0,
        "blobtoolkit_no_hit": 0,
        "blobtoolkit_api_errors": 0,
    }
    if saved_assembly_accessions:
        still_present = list(
            Assembly.objects(
                accession__in=saved_assembly_accessions,
                blobtoolkit_id=None,
            ).scalar("accession")
        )
        if still_present:
            blob_stats = bulk_link_blobtoolkit_for_assembly_accessions(still_present)

    return {
        "saved_assembly_accessions": saved_assembly_accessions,
        "saved_biosample_accessions": newly_fetched_biosample_accessions,
        "saved_organism_taxids": saved_organism_taxids,
        "status": "ok",
        **blob_stats,
    }


@shared_task(name="assemblies_import", ignore_result=False)
def import_assemblies_by_bioproject(project_accession: Optional[str] = None) -> Dict[str, Any]:
    """
    Download project JSONL, then run ``_run_assembly_import_pipeline`` (organisms → biosamples
    → gated assembly/chromosome persistence → lineage reload → denorm sync).
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
    accessions_list = list(
        dict.fromkeys(str(a).strip() for a in accessions if a and str(a).strip())
    )
    logger.info("Assemblies to fetch: %s (unique)", len(accessions_list))

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
