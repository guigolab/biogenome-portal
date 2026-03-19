import csv
import logging
import os
from typing import Any, Dict, List, Optional

from celery import shared_task

from clients import ebi_client
from db.models import ReadRun, Experiment, Read
from helpers.biosample import handle_biosamples_from_accessions
from helpers.geolocation import update_geolocations
from helpers.import_organism_guard import (
    delete_rows_without_organism,
    surviving_taxids_after_cleanup,
)
from helpers.organism import (
    handle_full_taxonomy_from_taxids,
    reload_organisms_and_update_deps,
)
from helpers.taxon_organism_sync import sync_many_taxids
from parsers.read import parse_read_from_ena_portal

logger = logging.getLogger(__name__)

PROJECT_ACCESSION = os.getenv("PROJECT_ACCESSION")
TMP_DIR = os.getenv("TMP_DIR", "/tmp")
BATCH_SIZE = 5000


def _safe_remove(path: Optional[str]) -> None:
    """Remove a file if it exists; log and continue on failure."""
    if not path:
        return
    try:
        if os.path.isfile(path):
            os.remove(path)
    except OSError as exc:
        logger.warning("Could not remove temp file %s: %s", path, exc)


def _ensure_parent_dir(file_path: str) -> None:
    parent = os.path.dirname(file_path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def _insert_reads_batch(docs: List[ReadRun]) -> List[str]:
    """
    Insert a batch of ReadRun documents; on bulk failure, retry per document.
    Returns run_accession values successfully inserted.
    """
    if not docs:
        return []
    saved: List[str] = []
    try:
        ReadRun.objects.insert(docs)
        saved.extend(r.run_accession for r in docs)
        sync_many_taxids(r.taxid for r in docs)
    except Exception:
        logger.exception("Batch insert of %s read runs failed; retrying one-by-one", len(docs))
        inserted: List[ReadRun] = []
        for r in docs:
            try:
                ReadRun.objects.insert([r])
                saved.append(r.run_accession)
                inserted.append(r)
            except Exception:
                logger.exception("Failed to insert read run %s", getattr(r, "run_accession", "?"))
        if inserted:
            sync_many_taxids(r.taxid for r in inserted)
    return saved


@shared_task(name="reads_import", ignore_result=False)
def get_reads_from_bioproject_accession(
    project_accession: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Stream ENA read_run filereport for a bioproject, upsert ReadRun documents,
    then refresh biosamples, taxonomy, and geolocations for new runs.
    """
    if not project_accession:
        project_accession = PROJECT_ACCESSION
    if not project_accession:
        raise ValueError(
            "project_accession is required (argument or PROJECT_ACCESSION env var)."
        )

    output_file_path = os.path.join(TMP_DIR, f"reads_{project_accession}.tsv")
    _ensure_parent_dir(output_file_path)

    new_read_accessions: List[str] = []
    rows_skipped = 0
    inserted = 0
    updated = 0

    try:
        output_file = ebi_client.fetch_experiments_by_bioproject_streaming(
            project_accession, output_file_path
        )
        if not output_file:
            raise RuntimeError(
                f"ENA filereport returned no data for bioproject {project_accession!r} "
                "(network error, invalid accession, or empty result)."
            )

        existing_reads_accessions = set(ReadRun.objects().scalar("run_accession"))
        new_reads_to_save: List[ReadRun] = []
        reads_to_update: Dict[str, Any] = {}

        try:
            with open(output_file_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f, delimiter="\t")
                for row_index, read_run in enumerate(reader, start=2):
                    try:
                        read_to_save = parse_read_from_ena_portal(read_run)
                    except Exception:
                        rows_skipped += 1
                        logger.exception(
                            "Skipping invalid filereport row (line ~%s)", row_index
                        )
                        continue

                    if not read_to_save.run_accession:
                        rows_skipped += 1
                        logger.warning(
                            "Skipping row without run_accession (line ~%s)", row_index
                        )
                        continue

                    if read_to_save.run_accession in existing_reads_accessions:
                        reads_to_update[read_to_save.run_accession] = read_to_save.metadata
                        if len(reads_to_update) >= BATCH_SIZE:
                            for accession, metadata in reads_to_update.items():
                                try:
                                    ReadRun.objects(run_accession=accession).update(
                                        metadata=metadata
                                    )
                                    updated += 1
                                except Exception:
                                    logger.exception(
                                        "Failed to update metadata for run %s", accession
                                    )
                            reads_to_update.clear()
                    else:
                        new_reads_to_save.append(read_to_save)
                        if len(new_reads_to_save) >= BATCH_SIZE:
                            batch_saved = _insert_reads_batch(new_reads_to_save)
                            new_read_accessions.extend(batch_saved)
                            inserted += len(batch_saved)
                            existing_reads_accessions.update(batch_saved)
                            new_reads_to_save.clear()

            if new_reads_to_save:
                batch_saved = _insert_reads_batch(new_reads_to_save)
                new_read_accessions.extend(batch_saved)
                inserted += len(batch_saved)
                existing_reads_accessions.update(batch_saved)

            if reads_to_update:
                for accession, metadata in reads_to_update.items():
                    try:
                        ReadRun.objects(run_accession=accession).update(metadata=metadata)
                        updated += 1
                    except Exception:
                        logger.exception(
                            "Failed to update metadata for run %s", accession
                        )

        except OSError as exc:
            raise RuntimeError(
                f"Could not read downloaded TSV at {output_file_path!r}"
            ) from exc

        biosamples_to_fetch = ReadRun.objects(
            run_accession__in=new_read_accessions
        ).scalar("sample_accession")
        saved_biosample_accessions = handle_biosamples_from_accessions(
            biosamples_to_fetch, TMP_DIR
        )

        taxids = ReadRun.objects(run_accession__in=new_read_accessions).scalar("taxid")
        saved_organism_taxids = handle_full_taxonomy_from_taxids(taxids, TMP_DIR)
        reload_organisms_and_update_deps(saved_organism_taxids)
        if new_read_accessions:
            removed = delete_rows_without_organism(
                ReadRun, "run_accession", new_read_accessions
            )
            if removed:
                logger.info(
                    "Removed %s read run(s) with no Organism after taxonomy import",
                    removed,
                )
            surviving = surviving_taxids_after_cleanup(
                ReadRun, "run_accession", new_read_accessions
            )
            if surviving:
                sync_many_taxids(surviving)
        update_geolocations(saved_biosample_accessions)

        logger.info(
            "Reads import for %s finished: inserted=%s, metadata_updates=%s, rows_skipped=%s",
            project_accession,
            inserted,
            updated,
            rows_skipped,
        )
        return {
            "project_accession": project_accession,
            "inserted": inserted,
            "metadata_updates": updated,
            "rows_skipped": rows_skipped,
            "new_run_accessions": len(new_read_accessions),
            "status": "ok",
        }
    except Exception:
        logger.exception("get_reads_from_bioproject_accession failed for %s", project_accession)
        raise
    finally:
        _safe_remove(output_file_path)



@shared_task(name="clean_up_old_data", ignore_result=False)
def clean_up_deprecated_models():
    """
    Clean up old data from the database.
    """
    Experiment.drop_collection()
    Read.drop_collection()
