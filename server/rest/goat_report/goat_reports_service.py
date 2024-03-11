import csv
from db.enums import GoaTStatus,PublicationSource
from db.models import Organism,Publication,BioGenomeUser, GoaTUpdateDate
from io import StringIO
from itertools import islice
from ..organism import organisms_service
from ..utils import data_helper
from flask_jwt_extended import get_jwt
import os

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
    
    user = get_user()
    if not user:
        return [{"user": "User not found"}], 400
    
    taxids = [str(row.get('ncbi_taxon_id')) for row in rows]
    
    existing_organisms = Organism.objects(taxid__in=taxids)
    
    errors, new_taxons_to_parse = data_helper.validate_taxonomy(user, existing_organisms,taxids)
    
    if errors:
        return errors, 400
    
    if new_taxons_to_parse:
        create_organisms(new_taxons_to_parse, user)

    saved_organisms = update_organisms(rows, taxids)

    return saved_organisms, 200

def update_organisms(tsv_reader, taxids):
    saved_organisms = []
    organisms = Organism.objects(taxid__in=taxids)
    for index, row in enumerate(tsv_reader):
        taxid = str(row['ncbi_taxon_id'])
        for org in organisms:
            if taxid != org.taxid:
                continue
            if row['sequencing_status']:
                for status in GOAT_STATUS_IMPORT_MAPPER.keys():
                    if status == row['sequencing_status']:
                        org.goat_status = GOAT_STATUS_IMPORT_MAPPER[status]
            org.target_list_status = row['target_list_status']
            if row['publication_id'] and not any(pub.id == row['publication_id'] for pub in org.publications):
                pub_to_save = map_publication(row.get('publication_id'))
                org.publications.append(pub_to_save)
            saved_organisms.append({taxid: f"Organism {org.scientific_name} correctly saved"})
            org.save()
    return saved_organisms
    
def get_user():
    claims = get_jwt()
    username = claims.get('username')
    return BioGenomeUser.objects(name=username).first()


def validate_fields(tsv_reader):
    errors = []
    for index, row in enumerate(tsv_reader):
        row_index = index+ROWS_TO_SKIP
        for m_field in GOAT_MANDATORY_FIELDS:
            if not row[m_field]:
                errors.append(dict(index=row_index, message=f'{m_field} is mandatory'))
    return errors

def create_organisms(new_taxons_to_parse, user):
    taxonomic_infos = organisms_service.parse_organisms_from_ncbi_data(new_taxons_to_parse)
    for taxonomic_info in taxonomic_infos:
        taxid, scientific_name, insdc_common_name, lineage =  taxonomic_info
        organisms_service.create_organism_from_taxonomic_info(taxid, scientific_name, insdc_common_name, lineage)
        if user.role.value == 'DataManager':
            user.modify(add_to_set__species=taxid)


def map_publication(pub):
    publication_to_save = Publication()
    if '/' in pub:
        publication_to_save.source = PublicationSource.DOI
    if 'PMC' in pub:
        publication_to_save.source = PublicationSource.PMCID
    else:
        publication_to_save.source = PublicationSource.PMID
    publication_to_save.id = pub
    return publication_to_save