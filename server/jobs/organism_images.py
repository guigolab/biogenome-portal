"""Celery tasks: fetch attributed species images from external providers."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from celery import shared_task
from mongoengine.queryset.visitor import Q

from jobs.support.organism_images_fetch import fetch_external_image_candidates, run_external_image_backfill
from db.model import Organism, TargetListStatus
logger = logging.getLogger(__name__)


@shared_task(name="organisms.fetch_external_images", ignore_result=False)
def fetch_external_images_task(
    taxids: Optional[List[Any]] = None,
    min_images: Optional[int] = None,
    max_organisms: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Backfill ``Organism.images`` from iNaturalist, then Wikimedia Commons,
    then GBIF. Skips organisms that already have at least ``min_images`` entries.

    Optional kwargs (e.g. via POST /api/cronjob/organisms/fetch_external_images body):
    ``taxids``, ``min_images``, ``max_organisms``.
    """
    logger.info(
        "organisms.fetch_external_images: starting taxids=%s min_images=%s max_organisms=%s",
        taxids,
        min_images,
        max_organisms,
    )
    #overwrite organisms with null target list status
    q = Q(target_list_status="") | Q(target_list_status=None) | Q(target_list_status="")
    Organism.objects(q).update(set__target_list_status=TargetListStatus.OTHER_PRIORITY)
    try:
        result = run_external_image_backfill(
            taxids=taxids,
            min_images=min_images,
            max_organisms=max_organisms,
        )
    except Exception:
        logger.exception("organisms.fetch_external_images failed")
        raise
    logger.info("organisms.fetch_external_images: finished %s", result)
    return result


@shared_task(name="organisms.suggest_external_images", ignore_result=False)
def suggest_external_organism_images_task(
    scientific_name: str,
    max_images: int = 5,
) -> Dict[str, Any]:
    """
    Fetch up to ``max_images`` attribution-safe image candidates for
    ``scientific_name`` from iNaturalist, Wikimedia Commons, and GBIF,
    returning them as plain dicts ready for the CMS image form.

    Intended for interactive UI polling: trigger via
    POST /api/organisms/suggest_external_images, then poll
    GET /api/tasks/<task_id> until ready.
    """
    if not (scientific_name or "").strip():
        return {"status": "error", "message": "scientific_name is required", "images": []}
    logger.info(
        "organisms.suggest_external_images: scientific_name=%r max_images=%s",
        scientific_name,
        max_images,
    )
    try:
        images = fetch_external_image_candidates(scientific_name, max_images=int(max_images))
    except Exception:
        logger.exception("organisms.suggest_external_images failed for %r", scientific_name)
        raise
    logger.info(
        "organisms.suggest_external_images: found %d candidates for %r",
        len(images),
        scientific_name,
    )
    return {"status": "ok", "images": images}
