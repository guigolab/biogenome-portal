"""Shared database-layer constants (env-backed and enum-derived)."""

from __future__ import annotations

import os

from .enums import GoaTStatus

GOAT_PROJECT_NAME = os.getenv("GOAT_PROJECT_NAME")
MANUAL_GOAT_STATUSES = [
    GoaTStatus.SAMPLE_ACQUIRED,
    GoaTStatus.DATA_GENERATION,
    GoaTStatus.IN_ASSEMBLY,
]

__all__ = ["GOAT_PROJECT_NAME", "MANUAL_GOAT_STATUSES"]
