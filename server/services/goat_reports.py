import csv
import os
from io import StringIO

from db.constants import GOAT_PROJECT_NAME
from db.enums import GoaTStatus
from db.model import GoaTUpdateDate, Organism
from werkzeug.exceptions import BadRequest

GOAT_STATUS_EXPORT_MAPPER = {
    GoaTStatus.SAMPLE_COLLECTED.value: "sample_collected",
    GoaTStatus.SAMPLE_ACQUIRED.value: "sample_acquired",
    GoaTStatus.DATA_GENERATION.value: "data_generation",
    GoaTStatus.IN_ASSEMBLY.value: "in_assembly",
    GoaTStatus.INSDC_SUBMITTED.value: "insdc_submitted",
    GoaTStatus.PUBLICATION_AVAILABLE.value: "publication_available",
}

COLUMN_MAPPER = {
    "ncbi_taxon_id": "taxid",
    "species": "scientific_name",
}

GOAT_REPORT_COLUMNS = [
    "ncbi_taxon_id",
    "species",
    "subspecies",
    "family",
    "target_list_status",
    "sequencing_status",
    "synonym",
    "publication_id",
]

GOAT_HEADER_ROWS = [
    ["# project_name", GOAT_PROJECT_NAME],
    ["# subproject_name", os.getenv("GOAT_SUBPROJECT_NAME")],
    ["# primary_contact", os.getenv("GOAT_PRIMARY_CONTACT")],
    ["# primary_contact_institution", os.getenv("GOAT_PRIMARY_CONTACT_INSTITUTION")],
    ["# primary_contact_email", os.getenv("GOAT_PRIMARY_CONTACT_EMAIL")],
    ["# date_of_update", "23-03-02"],
    ["# schema_version", os.getenv("GOAT_SCHEMA_VERSION")],
]

STREAM_BUFFER_ROWS = 2000


def _get_column_value(column, organism):
    """Map a column name to its value from an organism dict."""
    if column in COLUMN_MAPPER and COLUMN_MAPPER[column] in organism:
        return organism[COLUMN_MAPPER[column]]
    if column == "target_list_status" and "target_list_status" in organism:
        return organism["target_list_status"]
    if column == "sequencing_status" and "goat_status" in organism:
        return GOAT_STATUS_EXPORT_MAPPER.get(organism["goat_status"], None)
    if column == "publication_id" and "publications" in organism:
        publications = organism["publications"]
        return ";".join(pub["id"] for pub in publications if "id" in pub)
    return None


def _stream_goat_report_tsv():
    """Generator that yields TSV chunks: header first, then STREAM_BUFFER_ROWS rows per chunk."""
    buf = StringIO()
    tsv = csv.writer(buf, delimiter="\t")

    goat_update = GoaTUpdateDate.objects().first()
    formatted_date = goat_update.updated.strftime("%Y-%m-%d") if goat_update else None

    headers = GOAT_HEADER_ROWS.copy()
    if formatted_date and len(headers) > 5 and len(headers[5]) > 1:
        headers[5][1] = formatted_date

    tsv.writerows(headers)
    tsv.writerow(GOAT_REPORT_COLUMNS)
    yield buf.getvalue().encode("utf-8")
    buf.close()

    batch = []
    for org in Organism.objects():
        organism = org.to_mongo().to_dict()
        row = [_get_column_value(col, organism) for col in GOAT_REPORT_COLUMNS]
        batch.append(row)
        if len(batch) >= STREAM_BUFFER_ROWS:
            buf = StringIO()
            tsv = csv.writer(buf, delimiter="\t")
            tsv.writerows(batch)
            yield buf.getvalue().encode("utf-8")
            buf.close()
            batch = []
    if batch:
        buf = StringIO()
        tsv = csv.writer(buf, delimiter="\t")
        tsv.writerows(batch)
        yield buf.getvalue().encode("utf-8")


def download_goat_report():
    if not GOAT_PROJECT_NAME:
        raise BadRequest(
            description="GoaT report export is disabled (GOAT_PROJECT_NAME is not set)."
        )
    try:
        filename = f"{GOAT_PROJECT_NAME}_species_goat.tsv"
        return _stream_goat_report_tsv(), filename
    except UnicodeEncodeError as e:
        raise BadRequest(description=f"File encoding error: {e}")
    except KeyError as e:
        raise BadRequest(description=f"Missing data key: {e}")
    except Exception as e:
        raise BadRequest(description=f"Unexpected error: {e}")
