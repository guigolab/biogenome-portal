import logging
import os
from urllib.parse import quote

from celery import shared_task
from mongoengine.errors import NotUniqueError, ValidationError

from clients import ebi_client
from db.model import BioSample

from helpers.data import create_batches
from jobs.organisms import fetch_tolid_prefixes_task
from jobs.support.organism_catalog_sync import (
    handle_full_taxonomy_from_taxids,
    reload_prune_denorm_after_taxonomy_import,
)
from jobs.support.geolocation_batch import update_geolocations
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


def _scalar_taxids_for_accessions(accessions):
    """Fetch taxids for accessions in batches to avoid huge $in queries."""
    taxids = []
    for batch in create_batches(list(accessions), ACCESSION_BATCH_SIZE):
        taxids.extend(BioSample.objects(accession__in=batch).scalar("taxid"))
    return taxids


@shared_task(name="biosamples_import", ignore_result=False)
def import_biosamples_from_project_names():
    """
    Pipeline phases:
    1) primary model (BioSample), 3) taxonomy bootstrap,
    4) related updates (prune/finalize, geolocation, async ToLID).
    """
    projects_env = os.getenv("PROJECTS")
    if not projects_env or not projects_env.strip():
        raise ValueError("No PROJECTS defined in environment")

    project_names = [p.strip() for p in projects_env.split(",") if p.strip()]
    saved_accessions = []
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
                            saved_accessions.append(doc.accession)
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
                    saved_accessions.extend(b.accession for b in new_biosamples)
                    stats["inserted"] += len(new_biosamples)

            page_count += 1
            stats["pages_fetched"] += 1

        logger.info(
            "Finished project %r: %d pages processed", project_name, page_count
        )

    if not saved_accessions:
        logger.info("No new biosamples to process for taxonomy/geolocation")
        return stats

    try:
        biosample_taxids = _scalar_taxids_for_accessions(saved_accessions)
        biosample_taxids = [t for t in biosample_taxids if t]
        saved_organism_taxids = handle_full_taxonomy_from_taxids(
            biosample_taxids, TMP_DIR
        )
        removed = reload_prune_denorm_after_taxonomy_import(
            BioSample,
            "accession",
            saved_accessions,
            saved_organism_taxids,
            merge_context="biosample_import",
        )
        stats["orphan_biosamples_removed"] += removed
        if removed:
            logger.info(
                "Removed %s biosample(s) with no Organism after taxonomy import",
                removed,
            )
        if saved_organism_taxids:
            fetch_tolid_prefixes_task.delay(list(saved_organism_taxids))
        update_geolocations(saved_accessions)
    except Exception:
        logger.exception(
            "Post-import taxonomy/geolocation failed after inserting %d biosamples",
            len(saved_accessions),
        )
        raise

    return stats
