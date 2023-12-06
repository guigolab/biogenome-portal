import csv
from db.enums import GoaTStatus,PublicationSource
from db.models import Organism,Publication
from io import StringIO
from mongoengine.queryset.visitor import Q
from itertools import islice
from ..organism import organisms_service

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


def download_goat_report():
    report = open('./goat_report.tsv', 'r',newline='')
    tsv_template = csv.reader(report, delimiter='\t')
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter='\t')
    for row in tsv_template:
        tsv.writerow(row)
    goat_columns = ['ncbi_taxon_id','species','subspecies','family','target_list_status','sequencing_status','synonym','publication_id']
    organisms = Organism.objects().as_pymongo()
    for organism in organisms:
        new_row = list()
        for column in goat_columns:
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


def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'common_name':
        return (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter))
    elif option == 'tolid':
        return (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))


GOAT_MANDATORY_FIELDS = ['ncbi_taxon_id','target_list_status']

def upload_goat_report(report):
    goat_data = StringIO(report.read().decode('utf-8'))
    rows_to_skip = 7
    goat_data = islice(goat_data, rows_to_skip, None)
    tsvreader = csv.DictReader(goat_data, delimiter='\t')
    errors = []
    saved_species=[]
    for index, row in enumerate(tsvreader):
        row_index = index+rows_to_skip
        for m_field in GOAT_MANDATORY_FIELDS:
            if not row[m_field]:
                errors.append(dict(index=row_index, message=f'{m_field} is mandatory'))
        if errors:
            continue #skip row if mandatory fields are no
        taxid = str(row['ncbi_taxon_id'])
        organism = organisms_service.get_or_create_organism(taxid)
        if not organism:
            errors.append(dict(index=row_index,message=f'taxid not found'))
            continue
        if row['sequencing_status']:
            for status in GOAT_STATUS_IMPORT_MAPPER.keys():
                if status == row['sequencing_status']:
                    organism.goat_status = GOAT_STATUS_IMPORT_MAPPER[status]
        organism.target_list_status = row['target_list_status']
        if row['publication_id'] and not any(pub.id == row['publication_id'] for pub in organism.publications):
            pub = row['publication_id']
            publication_to_save = Publication()
            if '/' in pub:
                publication_to_save.source = PublicationSource.DOI
            if 'PMC' in pub:
                publication_to_save.source = PublicationSource.PMCID
            else:
                publication_to_save.source = PublicationSource.PMID
            publication_to_save.id = pub
            organism.publications.append(publication_to_save)
        organism.save()
        saved_species.append(organism.taxid)
    return saved_species, errors