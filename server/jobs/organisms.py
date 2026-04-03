"""
Celery tasks for organism-related background work.
"""
import logging
from typing import Any, Dict, List, Optional

from celery import shared_task

from db.model import Organism
from jobs.support.iucn_redlist_fetch import (
    run_iucn_backfill_missing,
    run_iucn_fetch_for_taxids,
)
from jobs.support.tolid_prefixes import fetch_tolid_prefixes
from jobs.support.organism_catalog_sync import finalize_organism_catalog_for_taxids

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

    Uses ``jobs.support.organism_catalog_sync.finalize_organism_catalog_for_taxids``.
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
        finalize_organism_catalog_for_taxids(batch, copy_lineages=False)
        processed += len(batch)
        logger.info(
            "organisms.backfill_related_counts: processed %s/%s",
            processed,
            total,
        )

    return {"status": "ok", "count": processed, "batch_size": batch_size}


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
        result = run_iucn_fetch_for_taxids(taxids_list, force=bool(force))
    except Exception:
        logger.exception("organisms.fetch_iucn_redlist failed")
        raise
    logger.info("organisms.fetch_iucn_redlist: finished %s", result)
    return result


@shared_task(name="organisms.backfill_iucn_redlist", ignore_result=False)
def backfill_iucn_redlist_task(
    max_organisms: int = 250,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Backfill ``Organism.iucn_redlist`` for documents where it is missing.

    ``max_organisms`` limits work per run (default is conservative for IUCN). With ``force``,
    refreshes up to ``max_organisms`` organisms regardless of existing cache.

    POST body example::
        {"kwargs": {"max_organisms": 200, "force": false}}
    """
    logger.info(
        "organisms.backfill_iucn_redlist: starting max_organisms=%s force=%s",
        max_organisms,
        force,
    )
    try:
        result = run_iucn_backfill_missing(
            max_organisms=int(max_organisms),
            force=bool(force),
        )
    except Exception:
        logger.exception("organisms.backfill_iucn_redlist failed")
        raise
    logger.info("organisms.backfill_iucn_redlist: finished %s", result)
    return result
