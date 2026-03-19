"""
Shared GoaT species report TSV parsing (upload format).

Used by the REST upload flow and the Celery job so the job only receives a
filesystem path (small broker payload) instead of the full row list.
"""

from __future__ import annotations

import csv
import os
from io import StringIO
from itertools import islice
from typing import Any

ROWS_TO_SKIP = 7


def parse_goat_report_tsv(decoded_text: str) -> tuple[csv.DictReader, str | None]:
    """
    Parse UTF-8 TSV body. Returns a DictReader over data rows (after metadata
    and header) and the subproject value from the second metadata row.
    """
    io_report = StringIO(decoded_text)
    reader = csv.reader(io_report, delimiter="\t")
    next(reader, None)
    second_row = next(reader, None)
    second_column_value = (
        second_row[1].strip() if second_row and len(second_row) > 1 else None
    )
    sliced_data = islice(io_report, ROWS_TO_SKIP - 2, None)
    dict_reader = csv.DictReader(sliced_data, delimiter="\t")
    return dict_reader, second_column_value


def load_goat_report_rows_from_path(path: str) -> tuple[list[dict[str, Any]], str | None]:
    """Read a saved upload file from disk and return (rows, sub_project)."""
    with open(path, encoding="utf-8") as f:
        decoded = f.read()
    dict_reader, sub_project = parse_goat_report_tsv(decoded)
    return list(dict_reader), sub_project


def safe_unlink(path: str | None) -> None:
    if not path:
        return
    try:
        os.remove(path)
    except OSError:
        pass


def is_allowed_goat_upload_path(path: str, tmp_dir: str | None = None) -> bool:
    """
    Reject path traversal / unexpected files: must live under TMP_DIR and use
    our upload naming convention.
    """
    tmp_dir = tmp_dir or os.getenv("TMP_DIR", "/tmp")
    try:
        base = os.path.basename(path)
        if not base.startswith("goat_upload_") or not base.endswith(".tsv"):
            return False
        tmp_real = os.path.realpath(tmp_dir)
        path_real = os.path.realpath(path)
    except OSError:
        return False
    if not path_real.startswith(tmp_real + os.sep):
        return False
    return os.path.isfile(path_real)
