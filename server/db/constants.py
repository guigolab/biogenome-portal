"""Shared database-layer constants (env-backed and enum-derived)."""

from __future__ import annotations

import os
from typing import Literal

from .enums import GoaTStatus

GOAT_PROJECT_NAME = os.getenv("GOAT_PROJECT_NAME")

MANUAL_GOAT_STATUSES = [
    GoaTStatus.SAMPLE_ACQUIRED,
    GoaTStatus.DATA_GENERATION,
    GoaTStatus.IN_ASSEMBLY,
]

# Merge behaviour when applying inferred GoaT status (e.g. biosample import guards).
MergeContext = Literal["default", "biosample_import"]

# Pipeline order for comparing inferred vs current GoaT status (higher = further along).
GOAT_PIPELINE_RANK: dict[GoaTStatus, int] = {
    GoaTStatus.SAMPLE_COLLECTED: 1,
    GoaTStatus.SAMPLE_ACQUIRED: 2,
    GoaTStatus.DATA_GENERATION: 3,
    GoaTStatus.IN_ASSEMBLY: 4,
    GoaTStatus.INSDC_SUBMITTED: 5,
    GoaTStatus.PUBLICATION_AVAILABLE: 6,
}

__all__ = [
    "GOAT_PROJECT_NAME",
    "GOAT_PIPELINE_RANK",
    "MANUAL_GOAT_STATUSES",
    "MergeContext",
]
