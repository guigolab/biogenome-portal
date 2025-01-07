from db.enums import GoaTStatus
from db.models import Organism, GoaTUpdateDate
from helpers import user as user_helper, taxonomy as taxonomy_helper
from jobs import goat_report_upload
from werkzeug.exceptions import BadRequest
from io import StringIO
from itertools import islice
import csv
import os

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

ROWS_TO_SKIP = 7

def download_goat_report():
    try:
        # Prepare a StringIO file to write the TSV content
        with StringIO() as writer_file:
            tsv = csv.writer(writer_file, delimiter='\t')

            # Get the formatted update date
            goat_update = GoaTUpdateDate.objects().first()
            formatted_date = goat_update.updated.strftime("%Y-%m-%d") if goat_update else None

            # Update headers dynamically
            headers = GOAT_HEADER_ROWS.copy()  # Avoid modifying the original
            if formatted_date and len(headers) > 5 and len(headers[5]) > 1:
                headers[5][1] = formatted_date

            # Write headers and column definitions to the TSV
            tsv.writerows(headers)
            tsv.writerow(GOAT_REPORT_COLUMNS)

            # Helper to map columns to values
            def get_column_value(column, organism):
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

            # Write each organism's data to the TSV
            for org in Organism.objects():
                organism = org.to_mongo().to_dict()
                new_row = [get_column_value(column, organism) for column in GOAT_REPORT_COLUMNS]
                tsv.writerow(new_row)

            # Get the TSV content and filename
            tsv_report = writer_file.getvalue()
            filename = f"{GOAT_PROJECT_NAME}_species_goat.tsv"

        return tsv_report.encode('utf-8'), filename

    except UnicodeEncodeError as e:
        raise BadRequest(description=f"File encoding error: {e}")
    except KeyError as e:
        raise BadRequest(description=f"Missing data key: {e}")
    except Exception as e:
        raise BadRequest(description=f"Unexpected error: {e}")

def generate_tsv_reader(request_files):
    report = request_files.get('goat_report')
    if not report:
        raise BadRequest(description="Invalid 'goat_report' provided")
    try:
        decoded_report = report.read().decode('utf-8')
        io_report = StringIO(decoded_report)
        sliced_data = islice(io_report, ROWS_TO_SKIP, None)
        return csv.DictReader(sliced_data, delimiter='\t')
    except UnicodeDecodeError as e:
        raise BadRequest(description=f"File decoding error: {e}")
    except Exception as e:
        raise BadRequest(description=f"Unexpected error: {e}")
    
def upload_goat_report(request_files):

    tsvreader = generate_tsv_reader(request_files)
    rows = [row for row in tsvreader]

    if errors := validate_fields(rows):
        raise BadRequest(description=f"Validation errors: {' '.join(errors)}")
        
    user_obj = user_helper.get_current_user()
    if not user_obj:
        return BadRequest(description=f"User not found")
    
    taxids = [str(row.get('ncbi_taxon_id')) for row in rows]
    existing_taxids = Organism.objects(taxid__in=taxids).scalar('taxid')

    if existing_taxids:
        taxonomy_errors = taxonomy_helper.check_species_permission(user_obj, existing_taxids)
        if taxonomy_errors:
            raise BadRequest(description=f"Taxonomy permission errors: {' '.join(taxonomy_errors)}")
        
    task = goat_report_upload.upload_goat_report.delay(user_obj.name, rows)
    return dict(id=task.id, state=task.state), 200

def validate_fields(tsv_reader):
    errors = []
    for index, row in enumerate(tsv_reader):
        row_index = index+ROWS_TO_SKIP
        for m_field in GOAT_MANDATORY_FIELDS:
            if not row[m_field]:
                errors.append(f'{m_field} is mandatory in row {row_index}')
    return errors
