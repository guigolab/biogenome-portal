"""
Celery tasks for organism-related background work.
"""
import logging
from typing import Any, Dict, List, Optional

from celery import shared_task

from db.models import Organism  # noqa: F401 — loads signal handlers via db.signals
from helpers.organism import fetch_tolid_prefixes
from helpers.taxon_organism_sync import sync_many_taxids

logger = logging.getLogger(__name__)


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


@shared_task(name="organisms.backfill_related_counts", ignore_result=False)
def backfill_organism_related_counts(batch_size: int = 1000) -> Dict[str, Any]:
    """
    Recompute and persist denormalized related-data counters/statuses on Organism.

    Uses ``sync_many_taxids`` (batched Organism.save → pre_save/post_save + TaxonNode counts).
    """
    taxids = [str(t) for t in Organism.objects().scalar("taxid") if t]
    if not taxids:
        logger.info("organisms.backfill_related_counts: no organisms found")
        return {"status": "skipped", "count": 0, "batch_size": int(batch_size)}

    total = len(taxids)
    processed = 0
    batch_size = max(int(batch_size), 1)
    for i in range(0, total, batch_size):
        batch = taxids[i : i + batch_size]
        sync_many_taxids(batch)
        processed += len(batch)
        logger.info(
            "organisms.backfill_related_counts: processed %s/%s",
            processed,
            total,
        )

    return {"status": "ok", "count": processed, "batch_size": batch_size}
