"""
Import guards and batch taxid utilities shared by ingest jobs.

Orphan cleanup (delete catalog rows whose taxid has no Organism) and helpers to
collect taxids from import batches live here so taxonomy bootstrap and catalog
finalize stay decoupled.
"""

from __future__ import annotations

from typing import Any, Iterable, List, Optional, Set, Type, TypeVar

from db.model import Organism
from helpers.data import create_batches

TDoc = TypeVar("TDoc")

# Bounded ENA taxonomy fetch list size (keep in sync with callers using $in on taxids).
TAXID_LIST_LIMIT = 5000

_DEFAULT_BATCH = 3000


def existing_organism_taxids(
    candidate_taxids: Iterable[str],
    batch_size: int = _DEFAULT_BATCH,
) -> Set[str]:
    """Return the subset of candidate taxids that exist on Organism documents."""
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


def normalize_species_taxids(taxids: Optional[Iterable[Any]]) -> Set[str]:
    out: Set[str] = set()
    if not taxids:
        return out
    for t in taxids:
        if t is None:
            continue
        s = str(t).strip()
        if s:
            out.add(s)
    return out


def union_sorted_species_taxids(*parts: Iterable[Any]) -> List[str]:
    u: Set[str] = set()
    for p in parts:
        u |= normalize_species_taxids(p)
    return sorted(u)


def taxids_on_catalog_documents(
    catalog_model: Type[TDoc],
    id_field: str,
    document_ids: Optional[Iterable[str]],
    *,
    id_batch_size: int = 5000,
) -> Set[str]:
    out: Set[str] = set()
    if not document_ids:
        return out
    ids = list(dict.fromkeys(str(x) for x in document_ids if x))
    if not ids:
        return out
    in_key = f"{id_field}__in"
    for batch in create_batches(ids, id_batch_size):
        for t in catalog_model.objects(**{in_key: batch}).scalar("taxid"):
            if t is not None and str(t).strip():
                out.add(str(t))
    return out
