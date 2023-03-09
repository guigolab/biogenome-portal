import csv
from db.enums import GoaTStatus
from db.models import Organism
from io import StringIO

GOAT_STATUS_MAPPER={
    GoaTStatus.SAMPLE_COLLECTED.value: "sample_collected",
    GoaTStatus.SAMPLE_ACQUIRED.value: "sample_acquired",
    GoaTStatus.DATA_GENERATION.value:"data_generation",
    GoaTStatus.IN_ASSEMBLY.value:"in_assembly",
    GoaTStatus.INSDC_SUBMITTED.value:"insdc_submitted",
    GoaTStatus.PUBLICATION_AVAILABLE.value:"publication_available"
}

COLUMN_MAPPER = {
    'ncbi_taxon_id': "taxid",
    'species': 'scientific_name',
}

def download_goat_report():
    encode='utf-8'
    report = open('./goat_report.tsv', 'r',newline='')
    tsv_template = csv.reader(report, delimiter='\t')
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter='\t')
    for row in tsv_template:
        tsv.writerow(row)
    goat_columns = ['ncbi_taxon_id','species','subspecies','family','target_list_status','sequencing_status','synonym','publication_id']
    organisms = Organism.objects(goat_status__ne=None).as_pymongo()[:2]
    for organism in organisms:
        new_row = list()
        for column in goat_columns:
            if column in COLUMN_MAPPER.keys() and organism[COLUMN_MAPPER[column]]:
                    new_row.append(organism[COLUMN_MAPPER[column]])
            elif column == 'target_list_status' and 'target_list_status' in organism.keys() and organism['target_list_status']:
                new_row.append(organism['target_list_status'])
            elif column == 'sequencing_status' and 'goat_status' in organism.keys() and organism['goat_status']:
                new_row.append(GOAT_STATUS_MAPPER[organism['goat_status']])
            elif column == 'publication_id' and 'publications' in organism.keys() and organism['publications']:
                publications = ';'.join([pub['id'] for pub in organism['publications']])
                new_row.append(publications)
            else:
                new_row.append(None)
        tsv.writerow(new_row)
    content = writer_file.getvalue()
    return content.encode(encode)


# def upload_goat_report():
