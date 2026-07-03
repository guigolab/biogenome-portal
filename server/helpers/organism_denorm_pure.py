"""
Pure organism denorm rules (counts → goat_status). No MongoEngine.

**Deprecated:** ``Organism.insdc_status`` is no longer derived from catalog counts here
or in :mod:`helpers.rest_catalog_sync`. The model field may still be present in the DB
for legacy documents; UIs should prefer count-based INSDC ladder state where applicable.

Used by ``rest_catalog_sync``, bulk species sync jobs, and unit tests.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from db.constants import MergeContext
from db.enums import GoaTStatus

from jobs.support.goat_status import infer_goat_candidate, should_apply_goat_inference


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
    goat_status: Optional[GoaTStatus]
    update_goat_field: bool
    touch_goat_update_date: bool


def derive_organism_denorm(
    counts: RelatedCounts,
    *,
    current_goat_status: Optional[GoaTStatus],
    has_genome_publication: bool,
    goat_project_name: Optional[str],
    apply_goat_inference: bool = True,
    merge_context: MergeContext = "default",
) -> OrganismDenormDerived:
    update_goat = False
    touch_date = False
    resolved_goat = current_goat_status

    if goat_project_name and apply_goat_inference:
        inferred = infer_goat_candidate(counts, has_genome_publication)
        if should_apply_goat_inference(
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
        goat_status=resolved_goat,
        update_goat_field=update_goat,
        touch_goat_update_date=touch_date,
    )
