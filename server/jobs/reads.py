import logging
import os
from typing import Any, Dict, Optional

from celery import shared_task

from clients import ebi_client
from db.model import Experiment, Read, ReadRun
from helpers.job_paths import ensure_parent_dir, safe_remove_file
from jobs.taxonomy import enrich_organisms_post_taxonomy
from jobs.support.biosample_ingest import resolve_biosamples_for_accessions
from jobs.support.catalog_ingest_pipeline import (
    reload_prune_denorm_after_primary_import,
    run_phase2_taxonomy_bootstrap,
)
from jobs.support.geolocation_batch import update_geolocations
from jobs.support.readrun_ena_tsv import ingest_readruns_from_ena_tsv

logger = logging.getLogger(__name__)

PROJECT_ACCESSION = os.getenv("PROJECT_ACCESSION")
TMP_DIR = os.getenv("TMP_DIR", "/tmp")


@shared_task(name="reads_import", ignore_result=False)
def get_reads_from_bioproject_accession(
    project_accession: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Pipeline phases:
    1) primary model (ReadRun), 2) secondary model (BioSample), 3) taxonomy bootstrap,
    4) related updates (prune/finalize, geolocation, async ToLID).
    """
    if not project_accession:
        project_accession = PROJECT_ACCESSION
    if not project_accession:
        raise ValueError(
            "project_accession is required (argument or PROJECT_ACCESSION env var)."
        )

    output_file_path = os.path.join(TMP_DIR, f"reads_{project_accession}.tsv")
    ensure_parent_dir(output_file_path)

    try:
        output_file = ebi_client.fetch_experiments_by_bioproject_streaming(
            project_accession, output_file_path
        )
        if not output_file:
            raise RuntimeError(
                f"ENA filereport returned no data for bioproject {project_accession!r} "
                "(network error, invalid accession, or empty result)."
            )

        try:
            new_read_accessions, ingest_stats = ingest_readruns_from_ena_tsv(
                output_file_path
            )
        except OSError as exc:
            raise RuntimeError(
                f"Could not read downloaded TSV at {output_file_path!r}"
            ) from exc

        # Build per-biosample mapping to one representative run_accession for
        # failure audit records (first run per biosample, stable order from DB).
        related_id_by_biosample: Dict[str, str] = {}
        biosample_accessions_ordered: list = []
        for rr in ReadRun.objects(run_accession__in=new_read_accessions).only(
            "run_accession", "sample_accession"
        ):
            sa = rr.sample_accession
            if sa and sa not in related_id_by_biosample:
                related_id_by_biosample[sa] = rr.run_accession
                biosample_accessions_ordered.append(sa)

        saved_biosample_accessions = resolve_biosamples_for_accessions(
            biosample_accessions_ordered,
            TMP_DIR,
            assembly_by_biosample={},
            related_kind="ReadRun",
            related_id_by_biosample=related_id_by_biosample,
        )

        taxids = ReadRun.objects(run_accession__in=new_read_accessions).scalar("taxid")
        saved_organism_taxids = run_phase2_taxonomy_bootstrap(taxids, TMP_DIR)

        removed = reload_prune_denorm_after_primary_import(
            ReadRun,
            "run_accession",
            new_read_accessions or None,
            saved_organism_taxids,
            apply_goat_inference=True,
        )
        if removed:
            logger.info(
                "Removed %s read run(s) with no Organism after taxonomy import",
                removed,
            )

        if saved_organism_taxids:
            enrich_organisms_post_taxonomy.delay(list(saved_organism_taxids))

        update_geolocations(saved_biosample_accessions)

        logger.info(
            "Reads import for %s finished: inserted=%s, metadata_updates=%s, rows_skipped=%s",
            project_accession,
            ingest_stats.inserted,
            ingest_stats.updated,
            ingest_stats.rows_skipped,
        )
        return {
            "project_accession": project_accession,
            "inserted": ingest_stats.inserted,
            "metadata_updates": ingest_stats.updated,
            "rows_skipped": ingest_stats.rows_skipped,
            "new_run_accessions": len(new_read_accessions),
            "status": "ok",
        }
    except Exception:
        logger.exception(
            "get_reads_from_bioproject_accession failed for %s", project_accession
        )
        raise
    finally:
        safe_remove_file(output_file_path)


@shared_task(name="clean_up_old_data", ignore_result=False)
def clean_up_deprecated_models():
    """
    Clean up old data from the database.
    """
    Experiment.drop_collection()
    Read.drop_collection()
