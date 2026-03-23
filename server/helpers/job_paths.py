"""Filesystem helpers for Celery jobs and CLI temp files (paths, cleanup)."""

from __future__ import annotations

import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


def ensure_parent_dir(file_path: str) -> None:
    """Create parent directory for ``file_path`` if missing."""
    parent = os.path.dirname(file_path)
    if parent:
        os.makedirs(parent, exist_ok=True)


def safe_remove_file(path: Optional[str]) -> None:
    """Remove a regular file if it exists; log a warning on failure."""
    if not path:
        return
    try:
        if os.path.isfile(path):
            os.remove(path)
    except OSError as exc:
        logger.warning("Could not remove temp file %s: %s", path, exc)
