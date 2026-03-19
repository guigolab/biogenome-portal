import logging
import os
from urllib.parse import quote

from celery import shared_task
from mongoengine.errors import NotUniqueError, ValidationError

from clients import ebi_client
from db.models import BioSample
from helpers.biosample import (
    handle_biosample_location_data,
    handle_derived_samples,
)
from helpers.data import create_batches, update_lineage
from helpers.geolocation import update_geolocations
from helpers.import_organism_guard import (
    delete_rows_without_organism,
    surviving_taxids_after_cleanup,
)
from helpers.organism import (
    handle_full_taxonomy_from_taxids,
    handle_organism,
    reload_organisms_and_update_deps,
)
from helpers.taxon_organism_sync import sync_many_taxids
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


def _collect_parent_accessions_from_derived_samples():
    """
    Unique parent accessions referenced by 'sample derived from', without loading full documents.
    """
    qs = (
        BioSample.objects(
            __raw__={"metadata.sample derived from": {"$exists": True}}
        )
        .only("metadata")
        .batch_size(500)
    )
    parents = set()
    for doc in qs:
        try:
            meta = doc.metadata or {}
            parent = meta.get("sample derived from")
            if parent:
                parents.add(parent)
        except (TypeError, AttributeError):
            continue
    return parents


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


def _update_geolocations_batched(accessions):
    for batch in create_batches(list(accessions), ACCESSION_BATCH_SIZE):
        update_geolocations(batch)


def _fetch_and_persist_parent_biosample(parent_accession: str) -> bool:
    """
    Fetch a parent biosample from EBI, save, and run location / derived / lineage hooks.
    Returns True if persisted successfully.
    """
    try:
        biosample_response = ebi_client.get_sample_from_biosamples(parent_accession)
    except Exception as e:
        logger.exception(
            "EBI request failed for parent biosample %s: %s", parent_accession, e
        )
        return False

    if not biosample_response:
        logger.warning(
            "No data returned from EBI BioSamples API for parent %s; skipping",
            parent_accession,
        )
        return False

    biosample_obj = _parse_biosample_safe(
        biosample_response, context="parent fetch"
    )
    if not biosample_obj:
        return False

    try:
        biosample_obj.save()
    except (NotUniqueError, ValidationError) as e:
        logger.info(
            "Parent %s not saved (duplicate or validation): %s",
            parent_accession,
            e,
        )
        return False
    except Exception:
        logger.exception("Unexpected error saving parent biosample %s", parent_accession)
        return False

    try:
        handle_biosample_location_data(biosample_obj)
    except Exception:
        logger.exception(
            "handle_biosample_location_data failed for parent %s", parent_accession
        )

    try:
        handle_derived_samples(biosample_obj.accession)
    except Exception:
        logger.exception(
            "handle_derived_samples failed for parent %s", parent_accession
        )

    try:
        organism = handle_organism(biosample_obj.taxid)
        if organism:
            update_lineage(biosample_obj, organism, skip_sync=True)
    except Exception:
        logger.exception(
            "Organism/lineage update failed for parent %s (taxid=%s)",
            parent_accession,
            getattr(biosample_obj, "taxid", None),
        )

    return True


@shared_task(name="biosamples_import", ignore_result=False)
def import_biosamples_from_project_names():
    """
    Import biosamples for all comma-separated PROJECTS from EBI, then refresh taxonomy,
    geolocation, and missing parent samples referenced by 'sample derived from'.
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
        "parents_resolved": 0,
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
                    sync_many_taxids(b.taxid for b in new_biosamples)
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
        reload_organisms_and_update_deps(saved_organism_taxids)
        removed = delete_rows_without_organism(
            BioSample, "accession", saved_accessions
        )
        stats["orphan_biosamples_removed"] += removed
        if removed:
            logger.info(
                "Removed %s biosample(s) with no Organism after taxonomy import",
                removed,
            )
        surviving = surviving_taxids_after_cleanup(
            BioSample, "accession", saved_accessions
        )
        if surviving:
            sync_many_taxids(surviving)
        _update_geolocations_batched(saved_accessions)
    except Exception:
        logger.exception(
            "Post-import taxonomy/geolocation failed after inserting %d biosamples",
            len(saved_accessions),
        )
        raise

    # Parents referenced by derived samples: only fetch each missing parent once.
    try:
        parent_accessions = _collect_parent_accessions_from_derived_samples()
    except Exception:
        logger.exception("Failed listing biosamples with 'sample derived from'")
        raise

    if not parent_accessions:
        logger.info("No sibling-derived parent accessions to map")
        return stats

    logger.info(
        "Found %d unique parent accessions from derived-sample metadata",
        len(parent_accessions),
    )

    existing_parents = _existing_accessions_batch(parent_accessions)
    missing_parents = sorted(parent_accessions - existing_parents)

    for parent_accession in missing_parents:
        if _fetch_and_persist_parent_biosample(parent_accession):
            stats["parents_resolved"] += 1

    logger.info("Biosamples import finished: %s", stats)
    return stats


@shared_task(name="biosamples_parents", ignore_result=False)
def get_biosample_parents():
    """
    Cron: fetch and persist parent biosamples referenced by ``sample derived from``
    metadata when the parent document is missing locally.
    """
    stats = {"parents_resolved": 0, "missing_parents_checked": 0}
    try:
        parent_accessions = _collect_parent_accessions_from_derived_samples()
    except Exception:
        logger.exception("Failed listing biosamples with 'sample derived from'")
        raise

    if not parent_accessions:
        logger.info("No parent accessions referenced by derived samples")
        return stats

    existing_parents = _existing_accessions_batch(parent_accessions)
    missing_parents = sorted(parent_accessions - existing_parents)
    stats["missing_parents_checked"] = len(missing_parents)

    for parent_accession in missing_parents:
        if _fetch_and_persist_parent_biosample(parent_accession):
            stats["parents_resolved"] += 1

    logger.info("get_biosample_parents finished: %s", stats)
    return stats


@shared_task(name="biosamples_derived_from", ignore_result=False)
def get_biosamples_derived_from_parent():
    """
    Cron: for each parent accession referenced by derived samples, sync child
    biosamples from EBI (``get_samples_derived_from``).
    """
    stats = {"parents_processed": 0, "errors": 0}
    try:
        parent_accessions = _collect_parent_accessions_from_derived_samples()
    except Exception:
        logger.exception("Failed listing biosamples with 'sample derived from'")
        raise

    if not parent_accessions:
        logger.info("No parent accessions for derived-from sync")
        return stats

    for parent_accession in sorted(parent_accessions):
        try:
            handle_derived_samples(parent_accession)
            stats["parents_processed"] += 1
        except Exception:
            stats["errors"] += 1
            logger.exception(
                "handle_derived_samples failed for parent %s", parent_accession
            )

    logger.info("get_biosamples_derived_from_parent finished: %s", stats)
    return stats
