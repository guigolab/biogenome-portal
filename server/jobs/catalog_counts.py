"""
Full catalog counter recomputation (Celery): every Organism and TaxonNode roll-ups
reachable from organisms, via :mod:`jobs.support.stats` (per-species ``.count()`` updates).
"""

from __future__ import annotations

from celery import shared_task

from jobs.support.stats import compute_all_counts


@shared_task(name="compute_all_counts", ignore_result=True)
def compute_all_counts_task() -> int:
    """Celery entrypoint: full Organism and lineage-scoped TaxonNode counter recompute."""
    return compute_all_counts()


__all__ = ["compute_all_counts_task"]
