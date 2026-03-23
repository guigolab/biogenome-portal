"""
Pure organism denorm rules (counts → insdc_status / goat_status). No MongoEngine.

Used by ``rest_catalog_sync``, bulk species sync jobs, and unit tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Literal, Optional, Tuple

from db.enums import GoaTStatus, INSDCStatus

MANUAL_GOAT_STATUSES: List[GoaTStatus] = [
    GoaTStatus.SAMPLE_ACQUIRED,
    GoaTStatus.DATA_GENERATION,
    GoaTStatus.IN_ASSEMBLY,
]

MergeContext = Literal["default", "biosample_import"]

_GOAT_PIPELINE_RANK: dict[GoaTStatus, int] = {
    GoaTStatus.SAMPLE_COLLECTED: 1,
    GoaTStatus.SAMPLE_ACQUIRED: 2,
    GoaTStatus.DATA_GENERATION: 3,
    GoaTStatus.IN_ASSEMBLY: 4,
    GoaTStatus.INSDC_SUBMITTED: 5,
    GoaTStatus.PUBLICATION_AVAILABLE: 6,
}


def _goat_rank(status: Optional[GoaTStatus]) -> int:
    if status is None:
        return 0
    return _GOAT_PIPELINE_RANK.get(status, 0)


@dataclass(frozen=True)
class RelatedCounts:
    assemblies: int
    reads: int
    biosamples: int
    local_samples: int
    genome_annotations: int


@dataclass(frozen=True)
class OrganismDenormDerived:
    assemblies_count: int
    reads_count: int
    biosamples_count: int
    local_samples_count: int
    genome_annotations_count: int
    insdc_status: Optional[INSDCStatus]
    goat_status: Optional[GoaTStatus]
    update_goat_field: bool
    touch_goat_update_date: bool


def compute_insdc_status(counts: RelatedCounts) -> Optional[INSDCStatus]:
    candidates: List[Tuple[bool, INSDCStatus]] = [
        (counts.genome_annotations > 0, INSDCStatus.ANNOTATIONS),
        (counts.assemblies > 0, INSDCStatus.ASSEMBLIES),
        (counts.reads > 0, INSDCStatus.READS),
        (counts.biosamples > 0, INSDCStatus.SAMPLE),
    ]
    for cond, status in candidates:
        if cond:
            return status
    return None


def _infer_goat_candidate(counts: RelatedCounts, has_publications: bool) -> Optional[GoaTStatus]:
    status_candidates: List[Tuple[bool, GoaTStatus]] = [
        (has_publications, GoaTStatus.PUBLICATION_AVAILABLE),
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


def _should_apply_goat_inference(
    current: Optional[GoaTStatus],
    inferred: Optional[GoaTStatus],
    *,
    merge_context: MergeContext,
) -> bool:
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


def derive_organism_denorm(
    counts: RelatedCounts,
    *,
    current_goat_status: Optional[GoaTStatus],
    has_publications: bool,
    goat_project_name: Optional[str],
    apply_goat_inference: bool = True,
    merge_context: MergeContext = "default",
) -> OrganismDenormDerived:
    insdc = compute_insdc_status(counts)
    update_goat = False
    touch_date = False
    resolved_goat = current_goat_status

    if goat_project_name and apply_goat_inference:
        inferred = _infer_goat_candidate(counts, has_publications)
        if _should_apply_goat_inference(
            current_goat_status, inferred, merge_context=merge_context
        ):
            assert inferred is not None
            resolved_goat = inferred
            update_goat = True
            touch_date = True

    return OrganismDenormDerived(
        assemblies_count=counts.assemblies,
        reads_count=counts.reads,
        biosamples_count=counts.biosamples,
        local_samples_count=counts.local_samples,
        genome_annotations_count=counts.genome_annotations,
        insdc_status=insdc,
        goat_status=resolved_goat,
        update_goat_field=update_goat,
        touch_goat_update_date=touch_date,
    )
