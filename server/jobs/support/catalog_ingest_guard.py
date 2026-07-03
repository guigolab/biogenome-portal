"""
Import guards for catalog collections: orphan row deletion, organism stub pruning, batch taxids.

Deletes catalog rows whose species ``taxid`` has no ``Organism``, prunes lineage-empty organism
stubs when no dependent catalog rows exist, and shares bounded-query helpers with taxonomy
bootstrap and denorm code.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Type, TypeVar

from db.model import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
)
from helpers.data import create_batches
from helpers.rest_catalog_sync import (
    cascade_delete_assembly,
    cascade_delete_biosample,
    cascade_delete_local_sample,
)

logger = logging.getLogger(__name__)

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
        if not bad_ids:
            continue
        if model is Assembly:
            for bid in bad_ids:
                ass = model.objects(**{id_field: bid}).first()
                if ass:
                    cascade_delete_assembly(ass, sync_species=False)
            deleted += len(bad_ids)
        elif model is BioSample:
            for bid in bad_ids:
                doc = model.objects(**{id_field: bid}).first()
                if doc:
                    cascade_delete_biosample(doc, sync_species=False)
            deleted += len(bad_ids)
        elif model is LocalSample:
            for bid in bad_ids:
                doc = model.objects(**{id_field: bid}).first()
                if doc:
                    cascade_delete_local_sample(doc, sync_species=False)
            deleted += len(bad_ids)
        else:
            model.objects(**{f"{id_field}__in": bad_ids}).delete()
            deleted += len(bad_ids)

    return deleted

_LINEAGE_MISSING_RAW = {
    "$or": [
        {"taxon_lineage": {"$exists": False}},
        {"taxon_lineage": None},
        {"taxon_lineage": []},
    ]
}

_PRUNE_CATALOG_CHECK_BATCH = 400
_PRUNE_ORG_ITER_BATCH = 500


def _taxids_having_any_catalog_row(taxids: List[str]) -> Set[str]:
    """
    Among the given taxids, return those that have at least one catalog row
    (same five collections as :func:`_species_has_catalog_rows`).
    """
    found: Set[str] = set()
    if not taxids:
        return found
    for chunk in create_batches(taxids, _PRUNE_CATALOG_CHECK_BATCH):
        b = list(chunk)
        for model in (Assembly, BioSample, ReadRun, LocalSample, GenomeAnnotation):
            for t in model.objects(taxid__in=b).scalar("taxid"):
                if t is not None:
                    found.add(str(t).strip())
    return found


def prune_organisms_missing_taxon_lineage(
    scoped_taxids: Optional[Sequence[Any]] = None,
) -> int:
    """
    Delete organisms with missing or empty ``taxon_lineage`` only when they have no dependent
    catalog rows for that ``taxid``.

    If ``scoped_taxids`` is set, only organisms whose ``taxid`` is in that set are considered.
    Returns the number of Organism documents removed.
    """
    if scoped_taxids is not None:
        ids = sorted(
            {str(t).strip() for t in scoped_taxids if t is not None and str(t).strip()}
        )
        if not ids:
            return 0
        raw_q: dict[str, Any] = {"$and": [_LINEAGE_MISSING_RAW, {"taxid": {"$in": ids}}]}
    else:
        raw_q = dict(_LINEAGE_MISSING_RAW)

    removed = 0
    buffer: List[Organism] = []
    qs = Organism.objects(__raw__=raw_q).only("taxid").batch_size(_PRUNE_ORG_ITER_BATCH)
    for org in qs:
        buffer.append(org)
        if len(buffer) < _PRUNE_CATALOG_CHECK_BATCH:
            continue
        removed += _prune_organism_buffer(buffer)
        buffer = []
    if buffer:
        removed += _prune_organism_buffer(buffer)
    if removed:
        logger.info(
            "prune_organisms_missing_taxon_lineage: removed %s organism(s) (scoped=%s)",
            removed,
            scoped_taxids is not None,
        )
    return removed


def _prune_organism_buffer(orgs: List[Organism]) -> int:
    tids: List[str] = []
    by_tid: Dict[str, Organism] = {}
    for org in orgs:
        tid = str(org.taxid).strip() if org.taxid else ""
        if not tid:
            continue
        tids.append(tid)
        by_tid[tid] = org
    if not tids:
        return 0
    has_catalog = _taxids_having_any_catalog_row(tids)
    n = 0
    for tid, org in by_tid.items():
        if tid in has_catalog:
            continue
        try:
            org.delete()
            n += 1
        except Exception:
            logger.exception("Failed deleting organism without lineage taxid=%s", tid)
    return n
