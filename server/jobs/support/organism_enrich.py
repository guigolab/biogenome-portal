"""
Sync organism enrichment: lineage rank labels, IUCN, images, ToLID.

GoaT updates for catalog ingest are applied in the importer (see
:mod:`jobs.support.goat_status` ``apply_goat_status_after_*_ingest``), not here.
"""

from __future__ import annotations

import logging
import os
import time
from typing import Any, Dict, Iterable, List, Optional

from clients import tolid_client
from db.model import Organism
from helpers.data import create_batches
from jobs.support.catalog_ingest_guard import TAXID_LIST_LIMIT

logger = logging.getLogger(__name__)

FETCH_IUCN = os.getenv("FETCH_IUCN", "true")
FETCH_IMAGES = os.getenv("FETCH_IMAGES", "true")
FETCH_TOLID_PREFIXES = os.getenv("FETCH_TOLID_PREFIXES", "true")


def run_enrich_followup_for_taxids(
    tid_list: List[str],
    *,
    iucn_force: bool = False,
) -> Dict[str, Any]:
    """
    Run non-GoaT enrichment: lineage rank labels, then optional IUCN / images / ToLID per env flags.

    Does not run generic GoaT ladder inference—use :mod:`jobs.support.goat_status` from the
    relevant importer when ``GOAT_PROJECT_NAME`` is set.
    """
    normalized = [str(t).strip() for t in tid_list if t is not None and str(t).strip()]
    if not normalized:
        return {"status": "skipped", "reason": "no_taxids"}

    n = len(normalized)
    steps: List[str] = []
    results: Dict[str, Any] = {}

    from jobs.support.taxonomy import sync_backfill_organism_lineage_rank_labels_for_taxids

    lineage = sync_backfill_organism_lineage_rank_labels_for_taxids(normalized)
    steps.append("lineage_rank_labels")
    results["lineage_rank_labels"] = lineage

    if FETCH_IUCN == "true":
        results["iucn_redlist"] = fetch_iucn_redlist_for_taxids(
            normalized,
            force=bool(iucn_force),
        )
        steps.append("iucn_redlist")

    if FETCH_IMAGES == "true":
        results["external_images"] = fetch_external_organism_images(
            taxids=normalized,
            min_images=1,
            max_organisms=n,
        )
        steps.append("external_images")

    if FETCH_TOLID_PREFIXES == "true":
        fetch_tolid_prefixes(normalized)
        steps.append("tolid_prefixes")
        results["tolid_prefixes"] = {"status": "ok", "count": n}

    logger.info(
        "run_enrich_followup_for_taxids: finished steps=%s for %s taxids",
        steps,
        n,
    )
    return {
        "status": "ok",
        "taxids": n,
        "steps": steps,
        "results": results,
    }


def fetch_tolid_prefixes(taxids: Iterable[Any]) -> None:
    """
    Resolve and store ToLID prefixes on :class:`~db.model.Organism` (rate-limited HTTP).
    """
    taxids_list = [t for t in taxids if t is not None]
    if not taxids_list:
        return

    batches = create_batches(taxids_list, TAXID_LIST_LIMIT)
    for batch in batches:
        counter = 0
        for taxid in batch:
            tolid_prefix = tolid_client.get_tolid(taxid)
            if tolid_prefix:
                Organism.objects(taxid=taxid).update(tolid_prefix=tolid_prefix)
            counter += 1
            if counter == 3:
                time.sleep(1)
                counter = 0


def fetch_external_organism_images(
    taxids: Optional[List[Any]] = None,
    min_images: Optional[int] = None,
    max_organisms: Optional[int] = None,
    *,
    force_update: bool = False,
) -> Dict[str, Any]:
    """
    Backfill ``Organism.images`` from iNaturalist, Wikimedia Commons, and GBIF when below quota.

    Set ``force_update=True`` to replace existing images with a fresh fetch (same
    source order), not to append more.

    Delegates to :func:`jobs.support.organism_images_fetch.run_external_image_backfill`.
    """
    from jobs.support.organism_images_fetch import run_external_image_backfill

    return run_external_image_backfill(
        taxids=taxids,
        min_images=min_images,
        max_organisms=max_organisms,
        force_update=force_update,
    )


def fetch_iucn_redlist_for_taxids(
    taxids: List[Any],
    *,
    force: bool = False,
) -> Dict[str, Any]:
    """
    Fetch IUCN Red List assessments for the given NCBI taxids.

    Delegates to :func:`jobs.support.iucn_redlist_fetch.run_iucn_fetch_bulk_by_rank`.
    """
    from jobs.support.iucn_redlist_fetch import run_iucn_fetch_bulk_by_rank

    taxids_list = [str(t) for t in taxids if t is not None and str(t).strip()]
    if not taxids_list:
        return {"status": "skipped", "reason": "no_taxids"}
    return run_iucn_fetch_bulk_by_rank(taxids_list, force=bool(force))
