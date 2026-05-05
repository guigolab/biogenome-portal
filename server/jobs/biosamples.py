import logging
import os
from typing import List, Set
from urllib.parse import quote

from celery import shared_task
from mongoengine.errors import NotUniqueError, ValidationError

from clients import ebi_client
from db.constants import GOAT_PROJECT_NAME
from db.model import BioSample

from helpers.data import create_batches
from jobs.support.geolocation_batch import update_geolocations
from jobs.support.ingest_job_utils import dedupe_nonempty_strs, scalar_taxids_batched
from jobs.support.catalog_ingest_guard import (
    delete_rows_without_organism,
    prune_organisms_missing_taxon_lineage,
)
from jobs.support.organism_enrich import run_enrich_followup_for_taxids
from jobs.support.catalog_denorm_finalize import bulk_copy_organism_lineages_to_catalog
from jobs.support.catalog_taxonomy_bootstrap import handle_full_taxonomy_from_taxids
from jobs.support.stats import update_organism_counts, update_taxon_node_counts
from jobs.support.goat_status import apply_goat_status_after_biosample_ingest
from jobs.taxonomy import cleanup_catalog_outside_root_lineage
from parsers import biosample as biosample_parser

logger = logging.getLogger(__name__)

TMP_DIR = os.getenv("TMP_DIR", "/tmp")

# Keep MongoDB $in clauses bounded (BSON doc limit / practical query size).
ACCESSION_BATCH_SIZE = int(os.getenv("BIOSAMPLE_IMPORT_ACCESSION_BATCH", "5000"))


def _parse_biosample_safe(raw_sample, context: str):
    """Parse EBI sample JSON; log and skip invalid payloads instead of failing the job."""
    try:
        return biosample_parser.parse_biosample_from_ebi_data(raw_sample)
    except (ValueError, TypeError, KeyError, AttributeError) as e:
        acc = (raw_sample or {}).get("accession", "?")
        logger.warning("Skipping unparsable biosample %s (%s): %s", acc, context, e)
        return None

def _existing_accessions_batch(accessions):
    """Return a set of accessions that already exist, querying in chunks."""
    existing = set()
    acc_list = list(accessions)
    for batch in create_batches(acc_list, ACCESSION_BATCH_SIZE):
        existing.update(BioSample.objects(accession__in=batch).scalar("accession"))
    return existing


def _unique_taxid_strings_for_accessions(accessions) -> List[str]:
    """
    Distinct non-empty taxids for the given BioSample accessions (batched ``$in`` queries).
    Sorted for stable taxonomy / prune inputs without duplicate species work.
    """
    seen: Set[str] = set()
    acc_list = list(accessions)
    if not acc_list:
        return []
    for batch in create_batches(acc_list, ACCESSION_BATCH_SIZE):
        for t in BioSample.objects(accession__in=batch).scalar("taxid"):
            if t is not None and str(t).strip():
                seen.add(str(t).strip())
    return sorted(seen)


def _biosample_accessions_still_in_db(accessions: List[str]) -> List[str]:
    """Re-query accessions that still exist; chunked ``$in`` (bounded RAM / BSON)."""
    if not accessions:
        return []
    scalars: List = []
    for batch in create_batches(list(accessions), ACCESSION_BATCH_SIZE):
        scalars.extend(BioSample.objects(accession__in=batch).scalar("accession"))
    return dedupe_nonempty_strs(scalars)


@shared_task(name="biosamples_import", ignore_result=False)
def import_biosamples_from_project_names():
    """
    Canonical ingest phases:
    1) Fetch (EBI) and store primary model (BioSample).
    2) Taxonomy bootstrap; organism lineage prune.
    3) Prune orphan biosamples, copy lineage, recount touched species, status + enrich, geolocation.
    """
    projects_env = os.getenv("PROJECTS")
    if not projects_env or not projects_env.strip():
        raise ValueError("No PROJECTS defined in environment")

    project_names = [p.strip() for p in projects_env.split(",") if p.strip()]
    inserted_accessions: Set[str] = set()
    stats = {
        "projects": len(project_names),
        "pages_fetched": 0,
        "inserted": 0,
        "parse_skipped": 0,
        "fetch_errors": 0,
        "orphan_biosamples_removed": 0,
    }

    for project_name in project_names:
        # Encode project name for query string (spaces, unicode, special chars).
        encoded = quote(project_name, safe="")
        url = (
            "https://www.ebi.ac.uk/biosamples/samples?size=200"
            f"&filter=attr%3Aproject%20name%3A{encoded}"
        )
        page_count = 0

        while url:
            try:
                fetched_biosamples, new_url = ebi_client.fetch_biosamples_from_ebi(url)
            except Exception as e:
                stats["fetch_errors"] += 1
                logger.exception(
                    "Failed fetching biosamples page for project %r: %s",
                    project_name,
                    e,
                )
                break

            url = new_url
            if not fetched_biosamples:
                break

            parsed_biosamples = []
            for biosample in fetched_biosamples:
                parsed = _parse_biosample_safe(biosample, context=f"project={project_name}")
                if parsed:
                    parsed_biosamples.append(parsed)
                else:
                    stats["parse_skipped"] += 1

            if not parsed_biosamples:
                page_count += 1
                stats["pages_fetched"] += 1
                continue

            accessions = [b.accession for b in parsed_biosamples]
            existing = _existing_accessions_batch(accessions)
            new_biosamples = [b for b in parsed_biosamples if b.accession not in existing]

            if new_biosamples:
                try:
                    BioSample.objects.insert(new_biosamples)
                except Exception as e:
                    logger.exception(
                        "Bulk insert failed for project %r (%d docs): %s",
                        project_name,
                        len(new_biosamples),
                        e,
                    )
                    # Fall back to per-document save to salvage partial progress
                    for doc in new_biosamples:
                        try:
                            doc.save()
                            inserted_accessions.add(doc.accession)
                            stats["inserted"] += 1
                        except (NotUniqueError, ValidationError):
                            logger.debug(
                                "Skip duplicate or invalid biosample %s", doc.accession
                            )
                        except Exception:
                            logger.exception(
                                "Failed saving biosample %s", doc.accession
                            )
                else:
                    inserted_accessions.update(b.accession for b in new_biosamples)
                    stats["inserted"] += len(new_biosamples)

            page_count += 1
            stats["pages_fetched"] += 1

        logger.info(
            "Finished project %r: %d pages processed", project_name, page_count
        )

    if not inserted_accessions:
        logger.info("No new biosamples to process for taxonomy/geolocation")
        stats["root_lineage_cleanup"] = cleanup_catalog_outside_root_lineage()
        return stats

    saved_accessions_list = list(inserted_accessions)

    try:
        taxonomy_taxids = _unique_taxid_strings_for_accessions(saved_accessions_list)
        saved_organism_taxids = handle_full_taxonomy_from_taxids(
            taxonomy_taxids, TMP_DIR
        )
        prune_organisms_missing_taxon_lineage(taxonomy_taxids)

        removed = delete_rows_without_organism(
            BioSample, "accession", saved_accessions_list
        )
        stats["orphan_biosamples_removed"] += removed
        if removed:
            logger.info(
                "Removed %s biosample(s) with no Organism after taxonomy import",
                removed,
            )

        biosample_accessions_still_in_db = _biosample_accessions_still_in_db(
            saved_accessions_list
        )
        species_from_biosamples = scalar_taxids_batched(
            BioSample,
            "accession",
            biosample_accessions_still_in_db,
            batch_size=ACCESSION_BATCH_SIZE,
        )
        species_to_refresh = sorted(
            species_from_biosamples
            | {str(t) for t in saved_organism_taxids if t}
        )

        if species_to_refresh:
            bulk_copy_organism_lineages_to_catalog(species_to_refresh)
            update_organism_counts(species_to_refresh)
            update_taxon_node_counts(species_to_refresh)
            if (GOAT_PROJECT_NAME or "").strip():
                apply_goat_status_after_biosample_ingest(species_to_refresh)
            run_enrich_followup_for_taxids(species_to_refresh)

        update_geolocations(biosample_accessions_still_in_db)
    except Exception:
        logger.exception(
            "Post-import taxonomy/geolocation failed after inserting %d biosamples",
            len(inserted_accessions),
        )
        raise

    stats["root_lineage_cleanup"] = cleanup_catalog_outside_root_lineage()
    return stats
