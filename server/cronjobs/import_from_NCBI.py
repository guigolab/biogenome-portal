from cmath import exp
import requests
import time
from utils import ena_client,utils
from services import organisms_service,geo_loc_service, bioproject_service,annotations_service,assembly_service,biosample_service,experiment_service
from db.models import Assembly, Experiment,BioSample,Chromosome
from datetime import datetime

def import_from_NCBI(project_accession):
    assemblies = get_assemblies(project_accession)
    existing_assembly_accessions=Assembly.objects.scalar('accession')
    for ass in assemblies:
        if ass['assembly_accession'] in existing_assembly_accessions:
            continue
        sample_accession=ass['biosample_accession']
        organism = organisms_service.get_or_create_organism(str(ass['org']['tax_id']))
        sample_obj = biosample_service.get_or_create_biosample(sample_accession,organism,ass)
        ass_obj = assembly_service.create_assembly(ass,organism,sample_obj)
        if 'chromosomes' in ass.keys():
            assembly_service.create_chromosomes(ass_obj, ass['chromosomes'])
        experiment_service.create_experiments(sample_obj,organism)
        bioproject_service.create_bioprojects_from_NCBI(ass['bioproject_lineages'],organism, sample_obj)
        annotations_service.parse_annotation(organism,ass_obj)
        geo_loc_service.get_or_create_coordinates(sample_obj)
    print('ASSEMBLIES FROM NCBI IMPORTED')


##retrieve assemblies by bioproject in NCBI
def get_assemblies(project_accession):
    assemblies=list()
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&filters.has_annotation=false&&page_size=100").json()
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

