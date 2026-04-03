"""
Shared Celery entry points for catalog ingest phases (taxonomy / prune+finalize).

Jobs may call these via ``.delay()`` for non-blocking workers or import the underlying
functions from :mod:`jobs.support.catalog_ingest_pipeline` synchronously.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional, Sequence

from celery import shared_task

from db.model import Assembly, BioSample, LocalSample, ReadRun
from helpers.organism_denorm_pure import MergeContext
from jobs.support.catalog_ingest_pipeline import (
    reload_prune_denorm_after_primary_import,
    run_phase2_taxonomy_bootstrap,
)
logger = logging.getLogger(__name__)

_CATALOG_MODEL_BY_NAME: dict[str, type] = {
    "Assembly": Assembly,
    "BioSample": BioSample,
    "ReadRun": ReadRun,
    "LocalSample": LocalSample,
}


@shared_task(name="catalog_ingest_taxonomy_bootstrap", ignore_result=False)
def catalog_ingest_taxonomy_bootstrap_task(
    taxids: Sequence[Any],
    tmp_dir: Optional[str] = None,
) -> List[str]:
    """Phase 2: ENA/INSDC organism + taxon bootstrap for the given taxids."""
    if tmp_dir is None:
        tmp_dir = os.getenv("TMP_DIR", "/tmp")
    return run_phase2_taxonomy_bootstrap(taxids, tmp_dir)


@shared_task(name="catalog_ingest_reload_prune_finalize", ignore_result=False)
def catalog_ingest_reload_prune_finalize_task(payload: Dict[str, Any]) -> int:
    """
    Phase 3 tail after primary import: reload lineages, prune orphans, finalize denorm.

    ``payload`` keys:

    - ``catalog_model``: ``\"BioSample\"``, ``\"ReadRun\"``, ``\"Assembly\"``, or ``\"LocalSample\"``
    - ``id_field``: MongoEngine id field name (e.g. ``\"accession\"``, ``\"run_accession\"``)
    - ``import_ids``: list of primary keys for this batch (optional)
    - ``saved_organism_taxids``: taxids returned from taxonomy bootstrap
    - ``merge_context``: optional ``\"default\"`` or ``\"biosample_import\"``
    - ``apply_goat_inference``: optional bool (default ``True``)
    """
    name = str(payload.get("catalog_model") or "")
    catalog_model: type = _CATALOG_MODEL_BY_NAME.get(name)
    if catalog_model is None:
        raise ValueError(
            f"Unknown catalog_model {name!r}; expected one of "
            f"{sorted(_CATALOG_MODEL_BY_NAME)}"
        )

    mc_raw = payload.get("merge_context")
    merge_context: Optional[MergeContext] = None
    if mc_raw == "biosample_import":
        merge_context = "biosample_import"
    elif mc_raw == "default":
        merge_context = "default"
    elif mc_raw is not None:
        raise ValueError(f"Invalid merge_context {mc_raw!r}")

    removed = reload_prune_denorm_after_primary_import(
        catalog_model,  # type: ignore[type-abstract]
        str(payload["id_field"]),
        payload.get("import_ids"),
        payload.get("saved_organism_taxids") or [],
        merge_context=merge_context,
        apply_goat_inference=bool(payload.get("apply_goat_inference", True)),
    )
    logger.info(
        "catalog_ingest_reload_prune_finalize_task: model=%s removed=%s",
        name,
        removed,
    )
    return removed
