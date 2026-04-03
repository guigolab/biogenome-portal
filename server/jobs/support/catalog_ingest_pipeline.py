"""
Central catalog ingest orchestration (phases 2–4 after primary writes).

Primary inserts stay in each Celery job; this module groups taxonomy bootstrap,
prune/finalize denorm, and optional REST sync helpers so all importers share one path.

See also :mod:`jobs.support.organism_catalog_sync` for re-exports.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Iterable, List, Optional, Sequence, Type, Union

from helpers.organism_denorm_pure import MergeContext
from jobs.support.organism_catalog_finalize import (
    finalize_organism_catalog_for_taxids,
    reload_prune_denorm_after_taxonomy_import,
)
from jobs.support.organism_catalog_guard import TDoc
from jobs.support.organism_catalog_taxonomy import handle_full_taxonomy_from_taxids


@dataclass
class CatalogIngestPhasesResult:
    """Outcome of post-primary ingest phases (taxonomy → prune → finalize tail)."""

    species_taxids_touched: List[str] = field(default_factory=list)
    new_organism_taxids: List[str] = field(default_factory=list)
    primary_ids: List[str] = field(default_factory=list)
    orphans_removed: int = 0
    extra: dict[str, Any] = field(default_factory=dict)


def run_phase2_taxonomy_bootstrap(
    taxids: Sequence[Any],
    tmp_dir: Optional[str] = None,
) -> List[str]:
    """
    Phase 2: ensure Organism + TaxonNode rows for the given species taxids.

    Returns taxids for which a new Organism row was created in this run (same contract as
    :func:`handle_full_taxonomy_from_taxids`).
    """
    if tmp_dir is None:
        tmp_dir = os.getenv("TMP_DIR", "/tmp")
    return handle_full_taxonomy_from_taxids(list(taxids), tmp_dir)


def reload_prune_denorm_after_primary_import(
    catalog_model: Type[TDoc],
    id_field: str,
    import_ids: Optional[Iterable[str]],
    saved_organism_taxids: Iterable[Any],
    *,
    merge_context: Optional[MergeContext] = None,
    apply_goat_inference: bool = True,
) -> int:
    """
    Phase 3 tail for biosample/read-style imports: lineage reload, orphan prune with cascades,
    denormalized counts and statuses (GoaT inference when ``GOAT_PROJECT_NAME`` is set).

    Returns number of catalog documents removed.
    """
    return reload_prune_denorm_after_taxonomy_import(
        catalog_model,
        id_field,
        import_ids,
        saved_organism_taxids,
        merge_context=merge_context,
        apply_goat_inference=apply_goat_inference,
    )


def finalize_touched_species_catalog(
    species_taxids: Iterable[Any],
    *,
    copy_lineages: bool = True,
    merge_context: MergeContext = "default",
    apply_goat_inference: bool = True,
) -> None:
    """
    Phase 3: refresh lineage copy (optional), organism counts, TaxonNode aggregates, INSDC/GoaT.

    Pass the **full** set of touched species (new + pre-existing), not only newly created
    organisms.
    """
    ids = sorted(
        {str(t).strip() for t in species_taxids if t is not None and str(t).strip()}
    )
    if not ids:
        return
    finalize_organism_catalog_for_taxids(
        ids,
        copy_lineages=copy_lineages,
        merge_context=merge_context,
        apply_goat_inference=apply_goat_inference,
    )


def sync_species_after_catalog_write(
    taxid: Union[str, int, None],
    taxon_lineage_fallback: Optional[Iterable[str]] = None,
    *,
    apply_goat_inference: bool = True,
    merge_context: MergeContext = "default",
) -> None:
    """
    Thin wrapper for REST single-row paths; delegates to
    :func:`helpers.rest_catalog_sync.sync_species_after_catalog_change`.
    """
    from helpers.rest_catalog_sync import sync_species_after_catalog_change

    sync_species_after_catalog_change(
        taxid,
        taxon_lineage_fallback,
        apply_goat_inference=apply_goat_inference,
        merge_context=merge_context,
    )


__all__ = [
    "CatalogIngestPhasesResult",
    "finalize_touched_species_catalog",
    "reload_prune_denorm_after_primary_import",
    "run_phase2_taxonomy_bootstrap",
    "sync_species_after_catalog_write",
]
