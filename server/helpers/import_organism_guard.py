"""
Import jobs: drop related documents when no Organism exists for their taxid.

Restricts deletions to rows whose id (accession, run_accession, etc.) is in the import batch.
"""

from __future__ import annotations

from typing import Iterable, Set, Type, TypeVar

from db.documents import Organism
from helpers.data import create_batches

_DEFAULT_BATCH = 3000

TDoc = TypeVar("TDoc")


def existing_organism_taxids(
    candidate_taxids: Iterable[str],
    batch_size: int = _DEFAULT_BATCH,
) -> Set[str]:
    """Return the subset of ``candidate_taxids`` that exist on ``Organism`` documents."""
    out: Set[str] = set()
    uniq = sorted({str(t) for t in candidate_taxids if t is not None})
    if not uniq:
        return out
    for batch in create_batches(uniq, batch_size):
        out.update(str(x) for x in Organism.objects(taxid__in=batch).scalar("taxid") if x)
    return out


def delete_rows_without_organism(
    model: Type[TDoc],
    id_field: str,
    id_values: Iterable[str],
    *,
    batch_size: int = _DEFAULT_BATCH,
) -> int:
    """
    For documents with ``id_field`` in ``id_values``, delete those whose ``taxid`` is not
    an existing Organism taxid.

    Returns the number of documents deleted.
    """
    if not id_values:
        return 0

    ids = list(dict.fromkeys(str(x) for x in id_values if x is not None))
    if not ids:
        return 0

    taxids_seen: Set[str] = set()
    for batch in create_batches(ids, batch_size):
        taxids_seen.update(
            str(t)
            for t in model.objects(**{f"{id_field}__in": batch}).scalar("taxid")
            if t is not None
        )

    valid = existing_organism_taxids(taxids_seen, batch_size=batch_size)
    deleted = 0

    for batch in create_batches(ids, batch_size):
        docs = model.objects(**{f"{id_field}__in": batch}).only(id_field, "taxid")
        bad_ids = []
        for d in docs:
            tid = getattr(d, "taxid", None)
            if tid is None or str(tid) not in valid:
                bad_ids.append(getattr(d, id_field))
        if bad_ids:
            model.objects(**{f"{id_field}__in": bad_ids}).delete()
            deleted += len(bad_ids)

    return deleted


def surviving_taxids_after_cleanup(
    model: Type[TDoc],
    id_field: str,
    id_values: Iterable[str],
    batch_size: int = _DEFAULT_BATCH,
) -> Set[str]:
    """Distinct taxids still present on ``model`` for the given id values."""
    if not id_values:
        return set()
    ids = list(dict.fromkeys(str(x) for x in id_values if x is not None))
    out: Set[str] = set()
    for batch in create_batches(ids, batch_size):
        out.update(
            str(t)
            for t in model.objects(**{f"{id_field}__in": batch}).scalar("taxid")
            if t is not None
        )
    return out
