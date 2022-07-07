import requests
import time
from utils import data_helper
from services import assembly
from db.models import Assembly

def import_from_NCBI(project_accession):
    assemblies = get_assemblies(project_accession)
    existing_assembly_accessions=Assembly.objects.scalar('accession')
    for ass in assemblies:
        if ass['assembly_accession'] in existing_assembly_accessions:
            continue
        sample_accession=ass['biosample_accession'] if 'biosample_accession' in ass.keys() else None
        assembly_obj = assembly.create_assembly_from_ncbi_data(ass,sample_accession)
        data_helper.create_data_from_assembly(assembly_obj,ass)
        ##trigger status update
    print('ASSEMBLIES FROM NCBI IMPORTED')


##retrieve assemblies by bioproject in NCBI
def get_assemblies(project_accession):
    assemblies=list()
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&&&page_size=100").json()
    counter = 1
    if 'assemblies' in result.keys():
        while 'next_page_token' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
            next_page_token = result['next_page_token']
            #max 3 requests per second without auth token
            if counter >= 3:
                time.sleep(1)
                counter = 0
            result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&filters.has_annotation=false&&page_size=1000&page_token={next_page_token}").json()
            counter+=1
        if 'assemblies' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
    return assemblies

