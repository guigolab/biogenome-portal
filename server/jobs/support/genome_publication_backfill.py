"""
One-off backfill: migrate the first ``Organism.publications`` entry into the new
``genome_publication`` field when an assembly is already linked.

For each organism with ``assemblies_count > 0``, a non-empty ``publications`` list,
and no ``genome_publication`` set yet:

1. Take ``publications[0]``.
2. Validate it against Europe PMC (rate-limited via ``services.publications``, same
   throttled path used by the interactive validate endpoint and Organism save path).
3. If valid: set ``genome_publication`` to it, remove it from ``publications``, and
   (when GoaT is enabled) promote ``goat_status`` to
   :attr:`~db.enums.GoaTStatus.PUBLICATION_AVAILABLE` when not already at/above that
   rank — mirrors ``jobs.support.goat_status`` since ``PUBLICATION_AVAILABLE`` is now
   keyed off ``genome_publication`` only (see ``helpers.organism_denorm_pure``).
4. If invalid (or the lookup fails): log and skip, leaving the organism untouched for
   manual follow-up.

Safe to re-run: organisms with ``genome_publication`` already set, or without a
linked assembly / publications, are excluded from the query.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from db.constants import GOAT_PIPELINE_RANK, GOAT_PROJECT_NAME
from db.enums import GoaTStatus
from db.model import Organism
from helpers.rest_catalog_sync import touch_goat_update_date
from services.publications import resolve_publication

logger = logging.getLogger(__name__)


def _normalize_goat_status(v: Any) -> Optional[GoaTStatus]:
    if v is None:
        return None
    if isinstance(v, GoaTStatus):
        return v
    if isinstance(v, str):
        for gs in GoaTStatus:
            if gs.value == v or gs.name == v:
                return gs
    return None


def _goat_rank(status: Optional[GoaTStatus]) -> int:
    if status is None:
        return 0
    return GOAT_PIPELINE_RANK.get(status, 0)


def _promote_goat_status_if_needed(organism: Organism) -> bool:
    """Set goat_status to PUBLICATION_AVAILABLE when GoaT is enabled and not already at/above it."""
    if not (GOAT_PROJECT_NAME or "").strip():
        return False
    target = GoaTStatus.PUBLICATION_AVAILABLE
    current = _normalize_goat_status(getattr(organism, "goat_status", None))
    if _goat_rank(current) >= _goat_rank(target):
        return False
    organism.goat_status = target
    return True


def run_genome_publication_backfill() -> Dict[str, Any]:
    """
    Iterate organisms with a linked assembly and existing ``publications`` but no
    ``genome_publication`` yet; migrate the first publication when it validates.
    """
    candidates = Organism.objects(
        assemblies_count__gt=0,
        publications__ne=[],
        genome_publication=None,
    ).only("taxid", "publications", "genome_publication", "assemblies_count", "goat_status")

    scanned = 0
    migrated = 0
    skipped_invalid = 0
    errors = 0
    promoted_goat_status = 0
    touch_taxids: List[str] = []

    for organism in candidates:
        scanned += 1
        publications = list(organism.publications or [])
        if not publications:
            continue
        first = publications[0]
        identifier = (first.id or "").strip()
        source = first.source.value if hasattr(first.source, "value") else first.source

        if not identifier:
            logger.warning(
                "genome_publication_backfill: skipping taxid=%s — first publication has no id",
                organism.taxid,
            )
            skipped_invalid += 1
            continue

        try:
            data = resolve_publication(source, identifier)
        except Exception:
            logger.exception(
                "genome_publication_backfill: validation failed for taxid=%s id=%s",
                organism.taxid,
                identifier,
            )
            errors += 1
            continue

        if data is None:
            logger.warning(
                "genome_publication_backfill: skipping taxid=%s — publication %r (%s) "
                "could not be resolved",
                organism.taxid,
                identifier,
                source,
            )
            skipped_invalid += 1
            continue

        organism.genome_publication = first
        organism.publications = publications[1:]
        if _promote_goat_status_if_needed(organism):
            promoted_goat_status += 1
            touch_taxids.append(str(organism.taxid))

        try:
            organism.save()
        except Exception:
            logger.exception(
                "genome_publication_backfill: save failed for taxid=%s", organism.taxid
            )
            errors += 1
            continue

        migrated += 1

    for taxid in touch_taxids:
        try:
            touch_goat_update_date(taxid)
        except Exception:
            logger.exception(
                "genome_publication_backfill: touch_goat_update_date failed for taxid=%s",
                taxid,
            )

    logger.info(
        "genome_publication_backfill: scanned=%d migrated=%d skipped_invalid=%d "
        "errors=%d promoted_goat_status=%d",
        scanned,
        migrated,
        skipped_invalid,
        errors,
        promoted_goat_status,
    )
    return {
        "scanned": scanned,
        "migrated": migrated,
        "skipped_invalid": skipped_invalid,
        "errors": errors,
        "promoted_goat_status": promoted_goat_status,
    }
