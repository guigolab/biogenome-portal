import logging
import os
from typing import Any, Dict, List, Optional

from celery import shared_task

from clients import ebi_client
from db.constants import GOAT_PROJECT_NAME
from db.model import BioSample, Experiment, Read, ReadRun
from helpers.job_paths import ensure_parent_dir, safe_remove_file
from jobs.support.biosample_ingest import resolve_biosamples_for_accessions
from jobs.support.catalog_taxonomy_bootstrap import handle_full_taxonomy_from_taxids
from jobs.support.geolocation_batch import update_geolocations
from jobs.support.ingest_job_utils import dedupe_nonempty_strs, scalar_taxids_batched
from jobs.support.catalog_ingest_guard import (
    delete_rows_without_organism,
    prune_organisms_missing_taxon_lineage,
)
from jobs.support.organism_enrich import run_enrich_followup_for_taxids
from jobs.support.readrun_ena_tsv import (
    apply_readrun_taxonomy_from_biosamples_for_accessions,
    backfill_readrun_scientific_name_from_organisms,
    ingest_readruns_from_ena_tsv,
)
from jobs.support.catalog_denorm_finalize import bulk_copy_organism_lineages_to_catalog
from jobs.support.stats import update_organism_counts, update_taxon_node_counts
from jobs.support.goat_status import apply_goat_status_after_reads_ingest
from parsers.read import READRUN_TAXID_PENDING
from jobs.support.read_batch_queries import (
    biosample_related_maps_from_run_accessions,
    run_accessions_still_in_database,
    unique_taxids_for_taxonomy_from_run_accessions,
)
from jobs.taxonomy import cleanup_catalog_outside_root_lineage

logger = logging.getLogger(__name__)

PROJECT_ACCESSION = os.getenv("PROJECT_ACCESSION")
TMP_DIR = os.getenv("TMP_DIR", "/tmp")


@shared_task(name="reads_import", ignore_result=False)
def get_reads_from_bioproject_accession(
    project_accession: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Canonical ingest phases:
    1) Fetch ENA TSV; store primary model (ReadRun); resolve linked BioSamples.
    2) Taxonomy bootstrap; organism lineage prune.
    3) Prune orphan runs, copy lineage and names, recount touched species, status + enrich, geolocation.
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
        # failure audit records (first run per biosample in ingestion order; batched queries).
        related_id_by_biosample, biosample_accessions_ordered = (
            biosample_related_maps_from_run_accessions(new_read_accessions)
        )

        saved_biosample_accessions = resolve_biosamples_for_accessions(
            biosample_accessions_ordered,
            TMP_DIR,
            assembly_by_biosample={},
            related_kind="ReadRun",
            related_id_by_biosample=related_id_by_biosample,
        )

        readrun_bio_sync = apply_readrun_taxonomy_from_biosamples_for_accessions(
            new_read_accessions
        )

        taxonomy_taxids = unique_taxids_for_taxonomy_from_run_accessions(
            new_read_accessions
        )
        saved_organism_taxids = handle_full_taxonomy_from_taxids(taxonomy_taxids, TMP_DIR)
        prune_organisms_missing_taxon_lineage(taxonomy_taxids)

        removed = delete_rows_without_organism(
            ReadRun,
            "run_accession",
            new_read_accessions or [],
        )
        if removed:
            logger.info(
                "Removed %s read run(s) with no Organism after taxonomy import",
                removed,
            )

        run_accessions_still_in_db: List[str] = []
        if new_read_accessions:
            run_accessions_still_in_db = run_accessions_still_in_database(
                new_read_accessions
            )

        if run_accessions_still_in_db:
            backfill_readrun_scientific_name_from_organisms(
                run_accessions_still_in_db
            )

        species_from_runs = scalar_taxids_batched(
            ReadRun, "run_accession", run_accessions_still_in_db
        )
        species_to_refresh = sorted(
            {
                t
                for t in species_from_runs
                if t and str(t).strip() != READRUN_TAXID_PENDING
            }
            | {str(t) for t in saved_organism_taxids if t}
        )

        if species_to_refresh:
            bulk_copy_organism_lineages_to_catalog(species_to_refresh)
            update_organism_counts(species_to_refresh)
            update_taxon_node_counts(species_to_refresh)
            if (GOAT_PROJECT_NAME or "").strip():
                apply_goat_status_after_reads_ingest(species_to_refresh)
            run_enrich_followup_for_taxids(species_to_refresh)

        biosample_accessions_for_geo = dedupe_nonempty_strs(
            BioSample.objects(accession__in=saved_biosample_accessions).scalar(
                "accession"
            )
        ) if saved_biosample_accessions else []
        update_geolocations(biosample_accessions_for_geo)

        logger.info(
            "Reads import for %s finished: inserted=%s, metadata_updates=%s, rows_skipped=%s, "
            "ncbi_fallback_filled=%s, rows_skipped_after_ncbi=%s, "
            "readrun_bio_updated=%s readrun_bio_deleted=%s",
            project_accession,
            ingest_stats.inserted,
            ingest_stats.updated,
            ingest_stats.rows_skipped,
            ingest_stats.ncbi_fallback_filled,
            ingest_stats.rows_skipped_after_ncbi,
            readrun_bio_sync.get("updated", 0),
            readrun_bio_sync.get("deleted", 0),
        )
        cleanup_result = cleanup_catalog_outside_root_lineage()
        return {
            "project_accession": project_accession,
            "inserted": ingest_stats.inserted,
            "metadata_updates": ingest_stats.updated,
            "rows_skipped": ingest_stats.rows_skipped,
            "ncbi_fallback_filled": ingest_stats.ncbi_fallback_filled,
            "rows_skipped_after_ncbi": ingest_stats.rows_skipped_after_ncbi,
            "new_run_accessions": len(run_accessions_still_in_db),
            "readruns_updated_from_biosample": readrun_bio_sync.get("updated", 0),
            "readruns_deleted_no_biosample": readrun_bio_sync.get("deleted", 0),
            "root_lineage_cleanup": cleanup_result,
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
