"""
Shared helpers for INSDC / catalog ingest Celery jobs (dedupe, batched scalars).
"""

from __future__ import annotations

from typing import Any, Iterable, List, Set, Type

from helpers.data import create_batches


def dedupe_nonempty_strs(iterable: Iterable[Any]) -> List[str]:
    """Stable dedupe of non-empty stringified values."""
    return list(
        dict.fromkeys(
            str(x).strip() for x in iterable if x is not None and str(x).strip()
        )
    )


def scalar_taxids_batched(
    model: Type,
    id_field: str,
    ids: Iterable[Any],
    batch_size: int = 5000,
) -> Set[str]:
    """
    Collect distinct ``taxid`` values for documents matching ``id_field__in`` batch.
    """
    ids_list = dedupe_nonempty_strs(ids)
    if not ids_list:
        return set()

    in_key = f"{id_field}__in"
    out: Set[str] = set()
    for batch in create_batches(ids_list, batch_size):
        for t in model.objects(**{in_key: batch}).scalar("taxid"):
            if t is not None and str(t).strip():
                out.add(str(t))
    return out


def maybe_enqueue_enrich_organisms(taxids: Iterable[Any]) -> None:
    """Enqueue taxonomy enrichment when the list is non-empty."""
    from jobs.taxonomy import enrich_organisms_post_taxonomy

    tid_list = dedupe_nonempty_strs(taxids)
    if tid_list:
        enrich_organisms_post_taxonomy.delay(tid_list)
