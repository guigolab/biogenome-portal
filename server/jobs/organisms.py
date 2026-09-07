"""
Celery tasks for organism-related background work.
"""
from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

from celery import shared_task
from pymongo import UpdateOne

from db.model import Organism, TaxonNode
from helpers import geolocation as geolocation_helper
from jobs.support.genome_publication_backfill import run_genome_publication_backfill
from jobs.support.iucn_redlist_fetch import (
    run_iucn_backfill_by_rank,
    run_iucn_fetch_missing_redlist,
    run_iucn_refresh_known_assessments,
)
from jobs.support.sequencing_type_metadata_backfill import (
    run_sequencing_type_metadata_backfill,
)
from jobs.support.organism_enrich import (
    fetch_iucn_redlist_for_taxids,
    fetch_tolid_prefixes,
)
from jobs.support.taxonomy import (
    ORGANISM_LINEAGE_LABELS_BATCH,
    _bulk_write_lineage_rank_labels_for_organism_docs,
)

logger = logging.getLogger(__name__)

# Batched $unset for Organism legacy / deprecated scalar fields (env-tunable).
_UNSET_ORGANISM_FIELDS_BULK = int(os.getenv("ORGANISM_UNSET_DEPRECATED_FIELDS_BULK", "2000"))

_ORGANISM_UNSET_FIELDS = {"insdc_status": "", "image": "", "image_urls": ""}

_ORGANISM_HAS_UNSET_TARGET_FIELDS_QUERY = {
    "$or": [
        {"insdc_status": {"$exists": True}},
        {"image": {"$exists": True}},
        {"image_urls": {"$exists": True}},
    ],
}


@shared_task(name="helpers_unset_organism_insdc_status_and_images", ignore_result=False)
def unset_organism_insdc_status_and_images() -> Dict[str, Any]:
    """
    Remove deprecated / cleared fields from every :class:`~db.model.Organism` that still
    has them, using MongoDB ``$unset`` in batches.

    Unsets:

    - ``insdc_status`` (no longer derived from catalog counts).
    - ``image`` and ``image_urls`` (primary image + URL list).

    For organisms that had a non-empty ``image``, also clears the denormalized
    ``SampleCoordinates.image`` for that taxid (same as the REST patch path) so map
    tiles do not keep a stale URL.
    """
    org_coll = Organism._get_collection()
    matched = org_coll.count_documents(_ORGANISM_HAS_UNSET_TARGET_FIELDS_QUERY)
    if matched == 0:
        logger.info(
            "Organism: no documents with insdc_status, image, or image_urls; nothing to do"
        )
        return {
            "unset_batches": 0,
            "documents_updated": 0,
            "matched_initially": 0,
            "geoloc_image_cleared_for_taxids": 0,
            "remaining_insdc_status": 0,
            "remaining_image": 0,
            "remaining_image_urls": 0,
        }

    batches = 0
    documents_updated = 0
    geoloc_cleared = 0
    cursor = org_coll.find(
        _ORGANISM_HAS_UNSET_TARGET_FIELDS_QUERY,
        {"_id": 1, "taxid": 1, "image": 1},
        batch_size=_UNSET_ORGANISM_FIELDS_BULK,
    )
    batch_docs: list = []

    def flush_batch() -> None:
        nonlocal batch_docs, documents_updated, batches, geoloc_cleared
        if not batch_docs:
            return
        ops = [
            UpdateOne({"_id": d["_id"]}, {"$unset": _ORGANISM_UNSET_FIELDS})
            for d in batch_docs
        ]
        org_coll.bulk_write(ops, ordered=False)
        documents_updated += len(batch_docs)
        batches += 1
        for d in batch_docs:
            tid = d.get("taxid")
            if tid and d.get("image"):
                geolocation_helper.add_image(str(tid), None)
                geoloc_cleared += 1
        batch_docs.clear()
        logger.info(
            "Organism: unset deprecated fields batch %d (%d document(s) updated so far)",
            batches,
            documents_updated,
        )

    for doc in cursor:
        batch_docs.append(doc)
        if len(batch_docs) >= _UNSET_ORGANISM_FIELDS_BULK:
            flush_batch()

    flush_batch()

    still_insdc = org_coll.count_documents({"insdc_status": {"$exists": True}})
    still_image = org_coll.count_documents({"image": {"$exists": True}})
    still_urls = org_coll.count_documents({"image_urls": {"$exists": True}})
    logger.info(
        "Organism: finished unsetting deprecated fields (%d batch(es), %d update(s), "
        "%d geolocation image clear(s)); remaining insdc_status=%d image=%d image_urls=%d",
        batches,
        documents_updated,
        geoloc_cleared,
        still_insdc,
        still_image,
        still_urls,
    )
    return {
        "unset_batches": batches,
        "documents_updated": documents_updated,
        "matched_initially": matched,
        "geoloc_image_cleared_for_taxids": geoloc_cleared,
        "remaining_insdc_status": still_insdc,
        "remaining_image": still_image,
        "remaining_image_urls": still_urls,
    }


@shared_task(name="helpers_backfill_organism_lineage_rank_labels", ignore_result=False)
def backfill_organism_lineage_rank_labels() -> Dict[str, Any]:
    """
    Set ``Organism.lineage_rank_labels`` from :class:`~db.model.TaxonNode` name/rank
    for each taxid in ``taxon_lineage``. Uses PyMongo bulk writes.

    Documents with no resolvable labels get ``lineage_rank_labels`` unset.
    """
    org_coll = Organism._get_collection()
    taxon_coll = TaxonNode._get_collection()

    scanned = 0
    set_count = 0
    unset_count = 0
    batch_docs: list = []

    def flush_batch():
        nonlocal batch_docs, set_count, unset_count
        if not batch_docs:
            return
        s, u = _bulk_write_lineage_rank_labels_for_organism_docs(
            batch_docs, org_coll, taxon_coll
        )
        set_count += s
        unset_count += u
        batch_docs = []

    cursor = org_coll.find({}, {"taxon_lineage": 1}).batch_size(ORGANISM_LINEAGE_LABELS_BATCH)
    for doc in cursor:
        scanned += 1
        batch_docs.append(doc)
        if len(batch_docs) >= ORGANISM_LINEAGE_LABELS_BATCH:
            flush_batch()

    flush_batch()

    logger.info(
        "backfill_organism_lineage_rank_labels: scanned=%d set=%d unset=%d",
        scanned,
        set_count,
        unset_count,
    )
    return {
        "organisms_scanned": scanned,
        "lineage_rank_labels_set": set_count,
        "lineage_rank_labels_unset": unset_count,
    }


@shared_task(name="organisms.fetch_tolid_prefixes", ignore_result=False)
def fetch_tolid_prefixes_task(taxids: Optional[List[Any]] = None) -> Dict[str, Any]:
    """
    Resolve and store ToLID prefixes for the given organism taxids (rate-limited HTTP).

    Intended to run after taxonomy import so the main assemblies import job can finish
    without blocking on many sequential external calls.
    """
    if not taxids:
        logger.info("organisms.fetch_tolid_prefixes: no taxids, skipping")
        return {"status": "skipped", "count": 0}

    taxids_list = list(taxids)
    logger.info(
        "organisms.fetch_tolid_prefixes: starting for %s taxids", len(taxids_list)
    )
    try:
        fetch_tolid_prefixes(taxids_list)
    except Exception:
        logger.exception("organisms.fetch_tolid_prefixes failed")
        raise
    logger.info("organisms.fetch_tolid_prefixes: finished for %s taxids", len(taxids_list))
    return {"status": "ok", "count": len(taxids_list)}

@shared_task(name="organisms.fetch_iucn_redlist", ignore_result=False)
def fetch_iucn_redlist_task(
    taxids: Optional[List[Any]] = None,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Fetch IUCN Red List data for specific taxids (``IUCN_TOKEN`` or ``UICN_TOKEN``).

    POST body example::
        {"kwargs": {"taxids": ["9606", "9685"], "force": false}}

    Skips organisms that already have ``iucn_redlist`` unless ``force`` is true.
    """
    if not taxids:
        logger.info("organisms.fetch_iucn_redlist: no taxids, skipping")
        return {"status": "skipped", "reason": "no_taxids"}

    taxids_list = [str(t) for t in taxids]
    logger.info(
        "organisms.fetch_iucn_redlist: starting for %s taxids (force=%s)",
        len(taxids_list),
        force,
    )
    try:
        result = fetch_iucn_redlist_for_taxids(taxids_list, force=bool(force))
    except Exception:
        logger.exception("organisms.fetch_iucn_redlist failed")
        raise
    logger.info("organisms.fetch_iucn_redlist: finished %s", result)
    return result


@shared_task(name="organisms.backfill_iucn_redlist", ignore_result=False)
def backfill_iucn_redlist_task() -> Dict[str, Any]:
    """
    Refresh ``Organism.iucn_redlist`` from the IUCN API for every organism in the database.
    """
    logger.info("organisms.backfill_iucn_redlist: starting (all organisms)")
    try:
        result = run_iucn_backfill_by_rank()
    except Exception:
        logger.exception("organisms.backfill_iucn_redlist failed")
        raise
    logger.info("organisms.backfill_iucn_redlist: finished %s", result)
    return result


@shared_task(name="organisms.refresh_iucn_known_assessments", ignore_result=False)
def refresh_iucn_known_assessments_task() -> Dict[str, Any]:
    """
    Re-fetch the full IUCN assessment for every organism that has a cached
    ``iucn_redlist.assessment_id``.

    Goes directly to ``assessment/{id}`` for each organism — no rank page scan —
    so this is fast and suitable for routine periodic refreshes of known-listed species.
    """
    logger.info("organisms.refresh_iucn_known_assessments: starting")
    try:
        result = run_iucn_refresh_known_assessments()
    except Exception:
        logger.exception("organisms.refresh_iucn_known_assessments failed")
        raise
    logger.info("organisms.refresh_iucn_known_assessments: finished %s", result)
    return result


@shared_task(name="organisms.fetch_iucn_missing_redlist", ignore_result=False)
def fetch_iucn_missing_redlist_task() -> Dict[str, Any]:
    """
    Run the bulk rank-based IUCN fetch for all organisms that have never been
    fetched (``iucn_redlist`` is ``None``).

    Organisms that were previously attempted (``not_found=True``) or that already
    have an ``assessment_id`` are excluded. Useful after a bulk organism import to
    populate IUCN data for newly added species without re-processing existing ones.
    """
    logger.info("organisms.fetch_iucn_missing_redlist: starting")
    try:
        result = run_iucn_fetch_missing_redlist()
    except Exception:
        logger.exception("organisms.fetch_iucn_missing_redlist failed")
        raise
    logger.info("organisms.fetch_iucn_missing_redlist: finished %s", result)
    return result


@shared_task(name="organisms.backfill_genome_publication", ignore_result=False)
def backfill_genome_publication_task() -> Dict[str, Any]:
    """
    One-off migration: for organisms with a linked assembly, move the first
    validated entry of ``publications`` into the new ``genome_publication`` field
    and remove it from the list. See
    ``jobs.support.genome_publication_backfill.run_genome_publication_backfill``.
    """
    logger.info("organisms.backfill_genome_publication: starting")
    try:
        result = run_genome_publication_backfill()
    except Exception:
        logger.exception("organisms.backfill_genome_publication failed")
        raise
    logger.info("organisms.backfill_genome_publication: finished %s", result)
    return result


@shared_task(name="organisms.backfill_sequencing_type_metadata", ignore_result=False)
def backfill_sequencing_type_metadata_task() -> Dict[str, Any]:
    """
    One-off migration: move the legacy top-level ``sequencing_type`` field into
    ``metadata.sequencing_type``. See
    ``jobs.support.sequencing_type_metadata_backfill.run_sequencing_type_metadata_backfill``.
    """
    logger.info("organisms.backfill_sequencing_type_metadata: starting")
    try:
        result = run_sequencing_type_metadata_backfill()
    except Exception:
        logger.exception("organisms.backfill_sequencing_type_metadata failed")
        raise
    logger.info("organisms.backfill_sequencing_type_metadata: finished %s", result)
    return result
