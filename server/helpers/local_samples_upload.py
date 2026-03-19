"""
Local samples spreadsheet upload: path checks and parsing from a saved .xlsx file.

The API saves uploads under TMP_DIR and passes only the path to Celery (small broker payload).
"""

from __future__ import annotations

import itertools
import os
from typing import Any

import openpyxl

from helpers import local_sample as excel_helper

TMP_DIR = os.getenv("TMP_DIR", "/tmp")


def is_allowed_local_samples_upload_path(path: str, tmp_dir: str | None = None) -> bool:
    tmp_dir = tmp_dir or os.getenv("TMP_DIR", "/tmp")
    try:
        base = os.path.basename(path)
        if not base.startswith("local_samples_upload_") or not base.endswith(".xlsx"):
            return False
        tmp_real = os.path.realpath(tmp_dir)
        path_real = os.path.realpath(path)
    except OSError:
        return False
    if not path_real.startswith(tmp_real + os.sep):
        return False
    return os.path.isfile(path_real)


def load_mapped_samples_from_xlsx_path(
    path: str,
    header: int | str,
    id_key: str | None,
    taxid_key: str | None,
    scientific_name_key: str | None,
    option: str,
    source: Any,
) -> tuple[list[dict[str, Any]] | None, list | None]:
    """
    Parse workbook at ``path`` the same way as the REST upload flow.
    Returns (mapped_samples, None) on success, or (None, errors) on validation/parse failure.
    ``errors`` is either a list of strings or the row-error structure from ``process_rows``.
    """
    wb_obj = openpyxl.load_workbook(path, data_only=True)
    sheet_obj = wb_obj.active
    header = int(header)
    header_row = excel_helper.get_header_row(sheet_obj, header)
    mandatory_fields = {
        "Local Id": id_key,
        "taxid": taxid_key,
        "Scientific name": scientific_name_key,
    }
    errors = excel_helper.validate_and_check_options(header_row, mandatory_fields, option)
    if errors:
        return None, errors

    rows_to_process = itertools.islice(sheet_obj.rows, header, None)
    rows_errors, samples = excel_helper.process_rows(
        rows_to_process, header_row, header, mandatory_fields
    )
    if rows_errors:
        return None, rows_errors

    mapped_samples = excel_helper.map_samples_to_dict(
        samples, id_key, source, scientific_name_key, taxid_key
    )
    return mapped_samples, None
