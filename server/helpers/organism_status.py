"""
Organism insdc_status / goat_status rules and related INSDC counts.
"""

from __future__ import annotations

import datetime
from dataclasses import dataclass
from typing import Any, List, Optional, Tuple

from db.documents import (
    Assembly,
    BioSample,
    BioSampleSubmission,
    GenomeAnnotation,
    GoaTUpdateDate,
    LocalSample,
    ReadRun,
)
from db.enums import GoaTStatus, INSDCStatus

MANUAL_GOAT_STATUSES: List[GoaTStatus] = [
    GoaTStatus.SAMPLE_ACQUIRED,
    GoaTStatus.DATA_GENERATION,
    GoaTStatus.IN_ASSEMBLY,
]


@dataclass(frozen=True)
class RelatedCounts:
    assemblies: int
    reads: int
    biosamples: int
    local_samples: int
    submitted_biosamples: int
    genome_annotations: int


def compute_insdc_status(counts: RelatedCounts) -> Optional[INSDCStatus]:
    """Highest completed INSDC stage wins (annotations > assemblies > reads > sample)."""
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


def fetch_related_counts(taxid: str) -> RelatedCounts:
    return RelatedCounts(
        assemblies=Assembly.objects(taxid=taxid).count(),
        reads=ReadRun.objects(taxid=taxid).count(),
        biosamples=BioSample.objects(taxid=taxid).count(),
        local_samples=LocalSample.objects(taxid=taxid).count(),
        submitted_biosamples=BioSampleSubmission.objects(taxid=taxid).count(),
        genome_annotations=GenomeAnnotation.objects(taxid=taxid).count(),
    )


def _touch_goat_update_date(taxid: str, when: datetime.datetime) -> None:
    """Persist GoaT last-updated timestamp."""
    GoaTUpdateDate.objects(taxid=taxid).update_one(
        set__updated=when,
        set__taxid=taxid,
        upsert=True,
    )


def refresh_organism_status_fields(
    document: Any,
    counts: RelatedCounts,
    *,
    goat_project_name: Optional[str],
    now: Optional[datetime.datetime] = None,
) -> None:
    """
    Mutate document (Organism) in place (pre_save). Updates GoaTUpdateDate when goat_status changes.
    """
    # Keep denormalized per-organism related-data counters in sync.
    document.assemblies_count = counts.assemblies
    document.reads_count = counts.reads
    document.biosamples_count = counts.biosamples
    document.local_samples_count = counts.local_samples
    document.submitted_biosamples_count = counts.submitted_biosamples
    document.genome_annotations_count = counts.genome_annotations

    document.insdc_status = compute_insdc_status(counts)

    if not goat_project_name:
        return

    current_goat_status = document.goat_status
    new_goat_status: Optional[GoaTStatus] = None
    status_candidates: List[Tuple[bool, GoaTStatus]] = [
        (bool(document.publications), GoaTStatus.PUBLICATION_AVAILABLE),
        (counts.assemblies > 0, GoaTStatus.INSDC_SUBMITTED),
        (counts.reads > 0, GoaTStatus.IN_ASSEMBLY),
        (
            counts.local_samples > 0 or counts.submitted_biosamples > 0 or counts.biosamples > 0,
            GoaTStatus.SAMPLE_COLLECTED,
        ),
    ]
    for cond, status in status_candidates:
        if cond:
            new_goat_status = status
            break

    if new_goat_status and new_goat_status != current_goat_status and not (
        new_goat_status == GoaTStatus.SAMPLE_COLLECTED
        and current_goat_status in MANUAL_GOAT_STATUSES
    ):
        document.goat_status = new_goat_status

    if current_goat_status != document.goat_status:
        when = now or datetime.datetime.now()
        _touch_goat_update_date(document.taxid, when)
