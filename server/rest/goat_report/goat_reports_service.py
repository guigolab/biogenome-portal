import csv
from db.enums import GoaTStatus
from db.models import Organism, GoaTUpdateDate
from io import StringIO
from itertools import islice
from helpers import user as user_helper, taxonomy as taxonomy_helper
import os
from jobs import goat_report_upload
from werkzeug.exceptions import NotFound
from celery.result import AsyncResult

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

ROWS_TO_SKIP = 7


GOAT_HEADER_ROWS = [
    ["# project_name", os.getenv('GOAT_PROJECT_NAME')],
    ["# subproject_name", os.getenv('GOAT_SUBPROJECT_NAME')],
    ["# primary_contact", os.getenv('GOAT_PRIMARY_CONTACT')],
    ["# primary_contact_institution", os.getenv('GOAT_PRIMARY_CONTACT_INSTITUTION')],
    ["# primary_contact_email", os.getenv('GOAT_PRIMARY_CONTACT_EMAIL')],
    ["# date_of_update", "23-03-02"],
    ["# schema_version", os.getenv('GOAT_SCHEMA_VERSION')],
]

def download_goat_report():
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter='\t')
    date = GoaTUpdateDate.objects().first().updated
    formatted_date = date.strftime("%Y-%m-%d")
    headers = GOAT_HEADER_ROWS
    if formatted_date:
        headers[5][1] = formatted_date
    tsv.writerows(headers)
    tsv.writerow(GOAT_REPORT_COLUMNS)
    organisms = Organism.objects().as_pymongo()
    for organism in organisms:
        new_row = []
        for column in GOAT_REPORT_COLUMNS:
            if column in COLUMN_MAPPER.keys() and organism[COLUMN_MAPPER[column]]:
                    new_row.append(organism[COLUMN_MAPPER[column]])
            elif column == 'target_list_status' and 'target_list_status' in organism.keys() and organism['target_list_status']:
                new_row.append(organism['target_list_status'])
            elif column == 'sequencing_status' and 'goat_status' in organism.keys() and organism['goat_status']:
                new_row.append(GOAT_STATUS_EXPORT_MAPPER[organism['goat_status']])
            elif column == 'publication_id' and 'publications' in organism.keys() and organism['publications']:
                publications = ';'.join([pub['id'] for pub in organism['publications']])
                new_row.append(publications)
            else:
                new_row.append(None)
        tsv.writerow(new_row)
    return writer_file.getvalue()

def generate_tsv_reader(report):
    goat_data = StringIO(report.read().decode('utf-8'))
    goat_data = islice(goat_data, ROWS_TO_SKIP, None)
    return csv.DictReader(goat_data, delimiter='\t')

def upload_goat_report(report):
    tsvreader = generate_tsv_reader(report)
    rows = []
    for row in tsvreader:
        rows.append(row)

    errors = validate_fields(rows)
    if errors:
        return errors, 400
    
    user_obj = user_helper.get_current_user()

    if not user_obj:
        return [{"user": "User not found"}], 400
    
    taxids = [str(row.get('ncbi_taxon_id')) for row in rows]
            
    existing_taxids = Organism.objects(taxid__in=taxids).scalar('taxid')

    if existing_taxids:
        taxonomy_errors = taxonomy_helper.check_species_permission(user_obj, existing_taxids)

        if taxonomy_errors:
            return taxonomy_errors, 400

    task = goat_report_upload.upload_goat_report.delay(user_obj.name, rows)

    return dict(id=task.id, state=task.state ), 200


def validate_fields(tsv_reader):
    errors = []
    for index, row in enumerate(tsv_reader):
        row_index = index+ROWS_TO_SKIP
        for m_field in GOAT_MANDATORY_FIELDS:
            if not row[m_field]:
                errors.append(dict(index=row_index, message=f'{m_field} is mandatory'))
    return errors


def get_task_status(task_id):
    task = AsyncResult(task_id)
    if task.result:
        return dict(messages=task.result['messages'], state=task.state )
    raise NotFound(description=f"Task {task_id} not found!")