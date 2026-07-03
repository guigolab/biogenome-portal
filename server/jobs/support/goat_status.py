"""
Bulk GoaT pipeline status updates on :class:`~db.model.Organism`.

Ingest jobs use ``apply_goat_status_after_*_ingest`` — importer-specific rules.

The generic ladder (:func:`infer_goat_candidate` + :func:`should_apply_goat_inference`)
is shared with :mod:`helpers.organism_denorm_pure` for status derivation on recount paths.

``Organism.insdc_status`` is deprecated and is not maintained by ingest or recount
helpers (GoaT updates in this module only).
"""

from __future__ import annotations

import datetime
from typing import Any, Iterable, List, Optional, Protocol, Union

from pymongo import UpdateOne

from db.constants import (
    GOAT_PIPELINE_RANK,
    GOAT_PROJECT_NAME,
    MANUAL_GOAT_STATUSES,
    MergeContext,
)
from db.enums import GoaTStatus
from db.model import GoaTUpdateDate, Organism

DEFAULT_CHUNK = 1000


class CatalogCountView(Protocol):
    """Counters that affect GoaT inference (annotations are not used in the ladder)."""

    assemblies: int
    reads: int
    biosamples: int
    local_samples: int


def _goat_rank(status: Optional[GoaTStatus]) -> int:
    if status is None:
        return 0
    return GOAT_PIPELINE_RANK.get(status, 0)


def has_genome_publication_set(organism) -> bool:
    """True when the organism has a ``genome_publication`` with a non-empty ``id``."""
    pub = getattr(organism, "genome_publication", None)
    return bool(pub and str(getattr(pub, "id", "") or "").strip())


def infer_goat_candidate(
    counts: CatalogCountView,
    has_genome_publication: bool,
) -> Optional[GoaTStatus]:
    """Highest-priority GoaT stage implied by counts and the genome assembly publication."""
    status_candidates: List[tuple[bool, GoaTStatus]] = [
        (has_genome_publication, GoaTStatus.PUBLICATION_AVAILABLE),
        (counts.assemblies > 0, GoaTStatus.INSDC_SUBMITTED),
        (counts.reads > 0, GoaTStatus.IN_ASSEMBLY),
        (
            counts.local_samples > 0 or counts.biosamples > 0,
            GoaTStatus.SAMPLE_COLLECTED,
        ),
    ]
    for cond, status in status_candidates:
        if cond:
            return status
    return None


def should_apply_goat_inference(
    current: Optional[GoaTStatus],
    inferred: Optional[GoaTStatus],
    *,
    merge_context: MergeContext,
) -> bool:
    """Whether to persist ``inferred`` over ``current`` (bulk / denorm paths)."""
    if inferred is None:
        return False
    if inferred == current:
        return False
    if inferred == GoaTStatus.SAMPLE_COLLECTED and current in MANUAL_GOAT_STATUSES:
        return False
    if merge_context == "biosample_import" and current in (
        GoaTStatus.DATA_GENERATION,
        GoaTStatus.IN_ASSEMBLY,
    ):
        if _goat_rank(inferred) < _goat_rank(current):
            return False
    return True


def _scalar_enum_value(v: Any) -> Any:
    if v is None:
        return None
    return v.value if hasattr(v, "value") else v


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


def _bulk_touch_goat_update_dates(
    taxids: Iterable[str],
    *,
    chunk_size: int,
    now: datetime.datetime,
) -> None:
    """Upsert :class:`~db.model.GoaTUpdateDate` rows for the given taxids."""
    seen = sorted({str(t) for t in taxids if t is not None and str(t).strip()})
    if not seen:
        return
    cs = max(int(chunk_size), 1)
    date_coll = GoaTUpdateDate._get_collection()
    for j in range(0, len(seen), cs):
        chunk = seen[j : j + cs]
        date_coll.bulk_write(
            [
                UpdateOne(
                    {"taxid": t},
                    {"$set": {"taxid": t, "updated": now}},
                    upsert=True,
                )
                for t in chunk
            ],
            ordered=False,
        )


def apply_goat_status_after_assembly_ingest(
    species_taxids: Iterable[Union[str, int]],
    *,
    chunk_size: int = DEFAULT_CHUNK,
) -> int:
    """
    After assembly catalog ingest: species with at least one assembly and no
    ``genome_publication`` get :attr:`~db.enums.GoaTStatus.INSDC_SUBMITTED`. Does not
    downgrade :attr:`~db.enums.GoaTStatus.PUBLICATION_AVAILABLE` or overwrite higher
    ranks.

    No-ops when ``GOAT_PROJECT_NAME`` is unset.
    """
    if not (GOAT_PROJECT_NAME or "").strip():
        return 0

    ids = sorted({str(t) for t in species_taxids if t is not None and str(t).strip()})
    if not ids:
        return 0

    org_coll = Organism._get_collection()
    touch_taxids: List[str] = []
    now = datetime.datetime.now()
    updated = 0
    cs = max(int(chunk_size), 1)
    target = GoaTStatus.INSDC_SUBMITTED

    for i in range(0, len(ids), cs):
        batch_ids = ids[i : i + cs]
        orgs = list(
            Organism.objects(taxid__in=batch_ids).only(
                "taxid",
                "goat_status",
                "genome_publication",
                "assemblies_count",
            )
        )
        org_by_tid = {str(o.taxid): o for o in orgs}

        ops: List[UpdateOne] = []
        for tid in batch_ids:
            org = org_by_tid.get(tid)
            if not org:
                continue
            if int(org.assemblies_count or 0) <= 0:
                continue
            if has_genome_publication_set(org):
                continue
            cur = _normalize_goat_status(getattr(org, "goat_status", None))
            if cur == target:
                continue
            if cur == GoaTStatus.PUBLICATION_AVAILABLE:
                continue
            if _goat_rank(cur) > _goat_rank(target):
                continue

            ops.append(
                UpdateOne(
                    {"taxid": tid},
                    {"$set": {"goat_status": _scalar_enum_value(target)}},
                )
            )
            updated += 1
            touch_taxids.append(tid)

        if ops:
            org_coll.bulk_write(ops, ordered=False)

    if touch_taxids:
        _bulk_touch_goat_update_dates(touch_taxids, chunk_size=cs, now=now)
    return updated


def apply_goat_status_after_reads_ingest(
    species_taxids: Iterable[Union[str, int]],
    *,
    chunk_size: int = DEFAULT_CHUNK,
) -> int:
    """
    After reads ingest: only organisms currently at ``Sample Collected`` or
    ``Sample Acquired`` are set to :attr:`~db.enums.GoaTStatus.IN_ASSEMBLY``
    (when ``reads_count`` is positive).

    No-ops when ``GOAT_PROJECT_NAME`` is unset.
    """
    if not (GOAT_PROJECT_NAME or "").strip():
        return 0

    ids = sorted({str(t) for t in species_taxids if t is not None and str(t).strip()})
    if not ids:
        return 0

    org_coll = Organism._get_collection()
    touch_taxids: List[str] = []
    now = datetime.datetime.now()
    updated = 0
    cs = max(int(chunk_size), 1)
    target = GoaTStatus.IN_ASSEMBLY
    allowed_current = (GoaTStatus.SAMPLE_COLLECTED, GoaTStatus.SAMPLE_ACQUIRED)

    for i in range(0, len(ids), cs):
        batch_ids = ids[i : i + cs]
        orgs = list(
            Organism.objects(taxid__in=batch_ids).only(
                "taxid",
                "goat_status",
                "reads_count",
            )
        )
        org_by_tid = {str(o.taxid): o for o in orgs}

        ops: List[UpdateOne] = []
        for tid in batch_ids:
            org = org_by_tid.get(tid)
            if not org:
                continue
            if int(org.reads_count or 0) <= 0:
                continue
            cur = _normalize_goat_status(getattr(org, "goat_status", None))
            if cur not in allowed_current:
                continue

            ops.append(
                UpdateOne(
                    {"taxid": tid},
                    {"$set": {"goat_status": _scalar_enum_value(target)}},
                )
            )
            updated += 1
            touch_taxids.append(tid)

        if ops:
            org_coll.bulk_write(ops, ordered=False)

    if touch_taxids:
        _bulk_touch_goat_update_dates(touch_taxids, chunk_size=cs, now=now)
    return updated


def apply_goat_status_after_biosample_ingest(
    species_taxids: Iterable[Union[str, int]],
    *,
    chunk_size: int = DEFAULT_CHUNK,
) -> int:
    """
    After biosample ingest: organisms with no ``goat_status`` or at
    ``Sample Collected`` get ``Sample Acquired`` when ``biosamples_count`` is positive.

    No-ops when ``GOAT_PROJECT_NAME`` is unset.
    """
    if not (GOAT_PROJECT_NAME or "").strip():
        return 0

    ids = sorted({str(t) for t in species_taxids if t is not None and str(t).strip()})
    if not ids:
        return 0

    org_coll = Organism._get_collection()
    touch_taxids: List[str] = []
    now = datetime.datetime.now()
    updated = 0
    cs = max(int(chunk_size), 1)
    target = GoaTStatus.SAMPLE_ACQUIRED

    for i in range(0, len(ids), cs):
        batch_ids = ids[i : i + cs]
        orgs = list(
            Organism.objects(taxid__in=batch_ids).only(
                "taxid",
                "goat_status",
                "biosamples_count",
            )
        )
        org_by_tid = {str(o.taxid): o for o in orgs}

        ops: List[UpdateOne] = []
        for tid in batch_ids:
            org = org_by_tid.get(tid)
            if not org:
                continue
            if int(org.biosamples_count or 0) <= 0:
                continue
            cur = _normalize_goat_status(getattr(org, "goat_status", None))
            if cur == target:
                continue
            if cur is not None and cur != GoaTStatus.SAMPLE_COLLECTED:
                continue

            ops.append(
                UpdateOne(
                    {"taxid": tid},
                    {"$set": {"goat_status": _scalar_enum_value(target)}},
                )
            )
            updated += 1
            touch_taxids.append(tid)

        if ops:
            org_coll.bulk_write(ops, ordered=False)

    if touch_taxids:
        _bulk_touch_goat_update_dates(touch_taxids, chunk_size=cs, now=now)
    return updated
