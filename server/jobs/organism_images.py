"""Celery tasks: fetch attributed species images from external providers."""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from celery import shared_task
from mongoengine.queryset.visitor import Q

from jobs.support.organism_images_fetch import run_external_image_backfill
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
