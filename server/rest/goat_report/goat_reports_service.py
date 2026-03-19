import os
import uuid
import csv

from db.enums import GoaTStatus
from db.models import Organism, GoaTUpdateDate
from helpers import user as user_helper, taxonomy as taxonomy_helper
from helpers.goat_report import (
    ROWS_TO_SKIP,
    load_goat_report_rows_from_path,
    parse_goat_report_tsv,
    safe_unlink,
)
from jobs import goat_report_upload
from werkzeug.exceptions import BadRequest
from io import StringIO

GOAT_PROJECT_NAME = os.getenv('GOAT_PROJECT_NAME')
GOAT_STATUS_EXPORT_MAPPER={
    GoaTStatus.SAMPLE_COLLECTED.value: "sample_collected",
    GoaTStatus.SAMPLE_ACQUIRED.value: "sample_acquired",
    GoaTStatus.DATA_GENERATION.value:"data_generation",
    GoaTStatus.IN_ASSEMBLY.value:"in_assembly",
    GoaTStatus.INSDC_SUBMITTED.value:"insdc_submitted",
    GoaTStatus.PUBLICATION_AVAILABLE.value:"publication_available"
}
GOAT_STATUS_IMPORT_MAPPER={
    "sample_collected":GoaTStatus.SAMPLE_COLLECTED,
    "sample_acquired":GoaTStatus.SAMPLE_ACQUIRED,
    "data_generation":GoaTStatus.DATA_GENERATION,
    "in_assembly":GoaTStatus.IN_ASSEMBLY,
    "insdc_submitted":GoaTStatus.INSDC_SUBMITTED,
    "publication_available":GoaTStatus.PUBLICATION_AVAILABLE
}

COLUMN_MAPPER = {
    'ncbi_taxon_id': "taxid",
    'species': 'scientific_name',
}

GOAT_REPORT_COLUMNS = ['ncbi_taxon_id','species','subspecies','family','target_list_status','sequencing_status','synonym','publication_id']
GOAT_MANDATORY_FIELDS = ['ncbi_taxon_id','target_list_status']

GOAT_HEADER_ROWS = [
    ["# project_name", GOAT_PROJECT_NAME],
    ["# subproject_name", os.getenv('GOAT_SUBPROJECT_NAME')],
    ["# primary_contact", os.getenv('GOAT_PRIMARY_CONTACT')],
    ["# primary_contact_institution", os.getenv('GOAT_PRIMARY_CONTACT_INSTITUTION')],
    ["# primary_contact_email", os.getenv('GOAT_PRIMARY_CONTACT_EMAIL')],
    ["# date_of_update", "23-03-02"],
    ["# schema_version", os.getenv('GOAT_SCHEMA_VERSION')],
]

STREAM_BUFFER_ROWS = 2000

TMP_DIR = os.getenv("TMP_DIR", "/tmp")


def _get_column_value(column, organism):
    """Map a column name to its value from an organism dict."""
    if column in COLUMN_MAPPER and COLUMN_MAPPER[column] in organism:
        return organism[COLUMN_MAPPER[column]]
    elif column == 'target_list_status' and 'target_list_status' in organism:
        return organism['target_list_status']
    elif column == 'sequencing_status' and 'goat_status' in organism:
        return GOAT_STATUS_EXPORT_MAPPER.get(organism['goat_status'], None)
    elif column == 'publication_id' and 'publications' in organism:
        publications = organism['publications']
        return ';'.join(pub['id'] for pub in publications if 'id' in pub)
    return None


def _stream_goat_report_tsv():
    """Generator that yields TSV chunks: header first, then STREAM_BUFFER_ROWS rows per chunk."""
    buf = StringIO()
    tsv = csv.writer(buf, delimiter='\t')

    goat_update = GoaTUpdateDate.objects().first()
    formatted_date = goat_update.updated.strftime("%Y-%m-%d") if goat_update else None

    headers = GOAT_HEADER_ROWS.copy()
    if formatted_date and len(headers) > 5 and len(headers[5]) > 1:
        headers[5][1] = formatted_date

    tsv.writerows(headers)
    tsv.writerow(GOAT_REPORT_COLUMNS)
    yield buf.getvalue().encode('utf-8')
    buf.close()

    batch = []
    for org in Organism.objects():
        organism = org.to_mongo().to_dict()
        row = [_get_column_value(col, organism) for col in GOAT_REPORT_COLUMNS]
        batch.append(row)
        if len(batch) >= STREAM_BUFFER_ROWS:
            buf = StringIO()
            tsv = csv.writer(buf, delimiter='\t')
            tsv.writerows(batch)
            yield buf.getvalue().encode('utf-8')
            buf.close()
            batch = []
    if batch:
        buf = StringIO()
        tsv = csv.writer(buf, delimiter='\t')
        tsv.writerows(batch)
        yield buf.getvalue().encode('utf-8')


def download_goat_report():
    try:
        filename = f"{GOAT_PROJECT_NAME}_species_goat.tsv"
        return _stream_goat_report_tsv(), filename
    except UnicodeEncodeError as e:
        raise BadRequest(description=f"File encoding error: {e}")
    except KeyError as e:
        raise BadRequest(description=f"Missing data key: {e}")
    except Exception as e:
        raise BadRequest(description=f"Unexpected error: {e}")

def generate_tsv_reader(request_files):
    """Parse upload from memory (e.g. tests). Production upload uses a temp file + path."""
    report = request_files.get("goat_report")
    if not report:
        raise BadRequest(description="Invalid 'goat_report' provided")

    try:
        decoded_report = report.read().decode("utf-8")
        return parse_goat_report_tsv(decoded_report)
    except UnicodeDecodeError as e:
        raise BadRequest(description=f"File decoding error: {e}")
    except Exception as e:
        raise BadRequest(description=f"Unexpected error: {e}")


def upload_goat_report(request_files):
    report = request_files.get("goat_report")
    if not report:
        raise BadRequest(description="Invalid 'goat_report' provided")

    os.makedirs(TMP_DIR, exist_ok=True)
    stored_path = os.path.join(TMP_DIR, f"goat_upload_{uuid.uuid4().hex}.tsv")

    try:
        report.save(stored_path)
    except OSError as e:
        raise BadRequest(description=f"Could not store upload: {e}")

    try:
        rows, sub_project = load_goat_report_rows_from_path(stored_path)
    except UnicodeDecodeError as e:
        safe_unlink(stored_path)
        raise BadRequest(description=f"File decoding error: {e}")
    except Exception as e:
        safe_unlink(stored_path)
        raise BadRequest(description=f"Unexpected error: {e}")

    if errors := validate_fields(rows):
        safe_unlink(stored_path)
        raise BadRequest(description=f"Validation errors: {'; '.join(errors)}")

    user_obj = user_helper.get_current_user()
    if not user_obj:
        safe_unlink(stored_path)
        raise BadRequest(description="User not found")

    taxids = [str(row.get("ncbi_taxon_id")) for row in rows]
    existing_taxids = Organism.objects(taxid__in=taxids).scalar("taxid")

    if existing_taxids:
        taxonomy_errors = taxonomy_helper.check_species_permission(user_obj, existing_taxids)
        if taxonomy_errors:
            safe_unlink(stored_path)
            raise BadRequest(
                description=f"Taxonomy permission errors: {'; '.join(taxonomy_errors)}"
            )

    try:
        task = goat_report_upload.upload_goat_report.delay(
            user_obj.name, stored_path, sub_project
        )
    except Exception:
        safe_unlink(stored_path)
        raise

    return dict(id=task.id, state=task.state), 200

def validate_fields(tsv_reader):
    errors = []
    for index, row in enumerate(tsv_reader):
        row_index = index+ROWS_TO_SKIP
        for m_field in GOAT_MANDATORY_FIELDS:
            if not row[m_field]:
                errors.append(f'{m_field} is mandatory in row {row_index}')
    return errors
