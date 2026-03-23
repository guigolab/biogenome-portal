"""
Local samples .xlsx parsing for Celery jobs only (used by local_samples_upload job).
"""

from __future__ import annotations

import itertools
import os
from typing import Any

import openpyxl

TMP_DIR = os.getenv("TMP_DIR", "/tmp")

OPTIONS = ["SKIP", "UPDATE"]


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


def map_samples_to_dict(samples, id_key, source, scientific_name_key, taxid_key):
    mapped_samples = []
    for s in samples:
        str_taxid = str(s.get(taxid_key))
        s_to_save = dict(
            taxid=str_taxid,
            local_id=s[id_key],
            broker=source,
            metadata=s["metadata"],
            scientific_name=s[scientific_name_key],
        )
        mapped_samples.append(s_to_save)
    return mapped_samples


def get_header_row(sheet_obj, header):
    return [cell.value for cell in sheet_obj[header] if cell.value]


def validate_header(header_row, mandatory_fields):
    errors = []
    for field, value in mandatory_fields.items():
        if not value:
            errors.append(f"{field} field missing")
        elif value not in header_row:
            errors.append(f"{value} not found in {', '.join(header_row)}")
    return errors


def validate_and_check_options(header_row, mandatory_fields, option):
    errors = []
    errors.extend(validate_header(header_row, mandatory_fields))
    if option not in OPTIONS:
        errors.append(f"option must be {' or '.join(OPTIONS)}, current is: {option}")
    return errors


def process_row(header_row, header, mandatory_fields, row, index):
    sample_error_obj = {index + header + 1: []}
    new_sample = {"metadata": {}}
    for key, cell in zip(header_row, row):
        if "orcid" in key.lower():
            continue
        if key in [f for f in mandatory_fields.values()]:
            if not cell.value:
                msg = f"{key} field is mandatory"
                sample_error_obj[index + header + 1].append(msg)
            else:
                new_sample[key] = str(cell.value).strip()
        if cell.value:
            new_sample["metadata"][key] = str(cell.value)

    if sample_error_obj[index + header + 1]:
        return sample_error_obj, new_sample

    return None, new_sample


def process_rows(rows, header_row, header, mandatory_fields):
    all_errors = []
    parsed_samples = []
    for index, row in enumerate(rows):
        values = len([cell.value for cell in row if cell.value])
        if values < 2:
            continue
        sample_error_obj, new_sample = process_row(
            header_row, header, mandatory_fields, row, index
        )
        if sample_error_obj:
            all_errors.append(sample_error_obj)
            continue
        parsed_samples.append(new_sample)
    return all_errors, parsed_samples


def load_mapped_samples_from_xlsx_path(
    path: str,
    header: int | str,
    id_key: str | None,
    taxid_key: str | None,
    scientific_name_key: str | None,
    option: str,
    source: Any,
) -> tuple[list[dict[str, Any]] | None, list | None]:
    wb_obj = openpyxl.load_workbook(path, data_only=True)
    sheet_obj = wb_obj.active
    header = int(header)
    header_row = get_header_row(sheet_obj, header)
    mandatory_fields = {
        "Local Id": id_key,
        "taxid": taxid_key,
        "Scientific name": scientific_name_key,
    }
    errors = validate_and_check_options(header_row, mandatory_fields, option)
    if errors:
        return None, errors

    rows_to_process = itertools.islice(sheet_obj.rows, header, None)
    rows_errors, samples = process_rows(rows_to_process, header_row, header, mandatory_fields)
    if rows_errors:
        return None, rows_errors

    mapped_samples = map_samples_to_dict(
        samples, id_key, source, scientific_name_key, taxid_key
    )
    return mapped_samples, None
