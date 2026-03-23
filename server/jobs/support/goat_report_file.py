"""GoaT species report TSV: parse from disk, validate rows, map to organism updates (Celery job only)."""

from __future__ import annotations

import csv
import os
from io import StringIO
from itertools import islice
from typing import Any

from db.embedded_docs import Publication
from db.enums import GoaTStatus, PublicationSource, TargetListStatus

ROWS_TO_SKIP = 7

GOAT_MANDATORY_FIELDS = ["ncbi_taxon_id"]

GOAT_STATUS_IMPORT_MAPPER = {
    "sample_collected": GoaTStatus.SAMPLE_COLLECTED.value,
    "sample_acquired": GoaTStatus.SAMPLE_ACQUIRED.value,
    "data_generation": GoaTStatus.DATA_GENERATION.value,
    "in_assembly": GoaTStatus.IN_ASSEMBLY.value,
    "insdc_submitted": GoaTStatus.INSDC_SUBMITTED.value,
    "publication_available": GoaTStatus.PUBLICATION_AVAILABLE.value,
}


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


def validate_goat_report_rows(rows: list[dict[str, Any]]) -> list[str]:
    errors = []
    for index, row in enumerate(rows):
        row_index = index + ROWS_TO_SKIP
        for m_field in GOAT_MANDATORY_FIELDS:
            if not row.get(m_field):
                errors.append(f"{m_field} is mandatory in row {row_index}")
    return errors


def map_rows(rows: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    rows_map: dict[str, dict[str, Any]] = {}
    for row in rows:
        tid = row.get("ncbi_taxon_id")
        if tid is None or tid == "":
            continue
        taxid = str(tid)
        entry: dict[str, Any] = {}
        seq_status = row.get("sequencing_status")
        if seq_status and seq_status in GOAT_STATUS_IMPORT_MAPPER:
            entry["goat_status"] = GOAT_STATUS_IMPORT_MAPPER[seq_status]
        # dict.get default only applies when the key is missing; TSV empty cells are "".
        tls = row.get("target_list_status")
        if tls is None or (isinstance(tls, str) and not tls.strip()):
            entry["target_list_status"] = TargetListStatus.LONG_LIST.value
        else:
            entry["target_list_status"] = (
                tls.strip() if isinstance(tls, str) else tls
            )

        if row.get("publication_id"):
            entry["publications"] = map_publication(row.get("publication_id"))

        rows_map[taxid] = entry
    return rows_map


def map_publication(pub: str) -> Publication:
    publication_to_save = Publication()
    if "/" in pub:
        publication_to_save.source = PublicationSource.DOI
    elif "PMC" in pub:
        publication_to_save.source = PublicationSource.PMCID
    else:
        publication_to_save.source = PublicationSource.PMID
    publication_to_save.id = pub
    return publication_to_save
