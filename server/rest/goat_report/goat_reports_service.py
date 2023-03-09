import csv
from db.enums import GoaTStatus
from db.models import Organism
from io import StringIO
from mongoengine.queryset.visitor import Q

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

def download_goat_report(download=False,goat_status=None, target_list_status=None, filter=None, filter_option='scientific_name'):
    encode='utf-8'
    report = open('./goat_report.tsv', 'r',newline='')
    tsv_template = csv.reader(report, delimiter='\t')
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter='\t')
    for row in tsv_template:
        tsv.writerow(row)
    goat_columns = ['ncbi_taxon_id','species','subspecies','family','target_list_status','sequencing_status','synonym','publication_id']
    query=dict()
    filter_query = get_filter(filter,filter_option)
    if goat_status:
        query['goat_status'] = goat_status
    if target_list_status:
        query['target_list_status'] = target_list_status
    organisms = Organism.objects(filter_query, **query).as_pymongo() if filter_query else Organism.objects.filter(**query).as_pymongo()
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
    return content.encode(encode), download


def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'common_name':
        return (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter))
    elif option == 'tolid':
        return (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

# def upload_goat_report():
