"""Save uploaded files to a temp path; remove the file if the caller fails before claiming it."""

from __future__ import annotations

import os
import uuid
from contextlib import contextmanager
from typing import Iterator


def safe_unlink(path: str | None) -> None:
    if not path:
        return
    try:
        os.remove(path)
    except OSError:
        pass


@contextmanager
def save_upload_to_temp(
    file_storage,
    tmp_dir: str,
    *,
    filename_prefix: str,
    suffix: str,
) -> Iterator[str]:
    os.makedirs(tmp_dir, exist_ok=True)
    path = os.path.join(tmp_dir, f"{filename_prefix}_{uuid.uuid4().hex}{suffix}")
    try:
        file_storage.save(path)
    except OSError:
        safe_unlink(path)
        raise
    try:
        yield path
    except Exception:
        safe_unlink(path)
        raise
