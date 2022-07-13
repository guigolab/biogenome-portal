import requests
import os
from datetime import datetime, timedelta
import time

API_URL = "http://biogenome_nginx/api"

def import_records():
    session = requests.Session()
    session.trust_env = False
    PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p]
    ACCESSION = os.getenv('PROJECT_ACCESSION')
    # if ACCESSION:
    #     import_from_NCBI(ACCESSION,session)
    # if PROJECTS:
    #     import_from_EBI_biosamples(PROJECTS,session)

    ##check new reads
    update_biosamples(session)

    ##convert local samples to biosample via copo api


def import_from_NCBI(project_accession,session):

    #get existing assemblies
    assemblies = session.get(f"{API_URL}/bulk/assembly")
    if assemblies.status_code != 200:
        print('API ERROR, UNABLE TO RETRIEVE ASSEMBLIES')
        return
    if not assemblies.json():
        print('NO ASSEMBLY PRESENT IN DB')
        existing_assemblies = list()
    else:
        existing_assemblies = [assembly['accession'] for assembly in assemblies.json()]
    assemblies = get_assemblies(project_accession)
    for assembly in assemblies:
        accession = assembly['assembly_accession']
        if accession in existing_assemblies:
            continue
        time.sleep(1)
        response = session.post(f"{API_URL}/assemblies/{accession}")
        print('response is', response.status_code)
    print(len(assemblies))
    # get all assemblies
    # iterate over ncbi_response
    # post new assembly
    # existing_assembly_accessions=Assembly.objects.scalar('accession')
    # for ass in assemblies:
    #     if ass['assembly_accession'] in existing_assembly_accessions:
    #         continue
    #     sample_accession=ass['biosample_accession'] if 'biosample_accession' in ass.keys() else None
    #     assembly_obj = assembly.create_assembly_from_ncbi_data(ass,sample_accession)
    #     data_helper.create_data_from_assembly(assembly_obj,ass)
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

def import_from_EBI_biosamples(PROJECTS,session):
    print('STARTING IMPORT BIOSAMPLES JOB')
    project_mapper = {p.split('_')[0]:p.split('_')[1] for p in PROJECTS}
    sample_dict = collect_samples(project_mapper.keys()) ##return dict with project names as keys
    ##get biosamples
    # sub_samples = list()
    biosamples = session.get(f"{API_URL}/bulk/biosample")
    if biosamples.status_code != 200:
        print('API ERROR, UNABLE TO RETRIEVE BIOSAMPLES')
        return
    if not biosamples.json():
        print('NO BIOSAMPLES PRESENT IN DB')
        existing_biosamples = list()
    else:
        existing_biosamples = [sample['accession'] for sample in existing_biosamples.json()]
    for project in sample_dict.keys():
        print(len(sample_dict[project]))
        for sample in sample_dict[project]:
            accession = sample['accession']
            if accession in existing_biosamples:
                continue
            time.sleep(1)
            response = session.post(f"{API_URL}/biosamples/{accession}")
            print('response is', response.status_code)
    #             continue
    #         biosample_obj = biosample.create_biosample_from_ebi_data(sample)
    #         organism_obj = data_helper.create_data_from_biosample(biosample_obj)
    #         # biosample = biosample_service.create_biosample_from_biosamples(sample, organism, sub_samples)
    #         bioproject.create_bioproject_from_ENA(project_mapper[project])
    #         organism_obj.modify(add_to_set__bioprojects=project_mapper[project])
    #         biosample_obj.modify(add_to_set__bioprojects=project_mapper[project])
    print('APPENDING SPECIMENS')
    ##append specimens as a backup if biosamples api fails
    # append_specimens(sub_samples)
    print('DATA FROM ENA/BIOSAMPLES IMPORTED')

def collect_samples(PROJECTS):
    samples = dict()
    for project in PROJECTS:
        biosamples = get_biosamples_page(f"https://www.ebi.ac.uk/biosamples/samples?size=10000&filter=attr%3Aproject%20name%3A{project}", [])
        print('lenght ebi biosamples of ',project, len(biosamples))
        if biosamples:
            samples[project] = biosamples
    return samples

def get_biosamples_page(url, samples):
    response = requests.get(url)
    if response.status_code !=  200:
        print('ERROR CALLING BIOSAMPLES API',response.content)
        return samples
    data = response.json()
    if '_embedded' in data.keys() and 'samples' in data['_embedded'].keys():
        samples.extend(data['_embedded']['samples'])
    if 'next' in data['_links'].keys():
        get_biosamples_page(data['_links']['next']['href'],samples)
    return samples

def update_biosamples(session):
    biosamples = session.get(f"{API_URL}/bulk/biosample")
    for biosample in biosamples.json():
        experiments = get_reads(biosample['accession'])
        print(len(experiments))
        for experiment in experiments:
            accession = experiment['experiment_accession']
            if accession not in biosample['experiments']:
                response = session.post(f"{API_URL}/experiments/{accession}")


def get_reads(accession):
    time.sleep(1)
    experiments_data = requests.get(f'https://www.ebi.ac.uk/ena/portal/'
                                        f'api/filereport?result=read_run'
                                        f'&accession={accession}'
                                        f'&offset=0&limit=1000&format=json'
                                        f'&fields=study_accession,'
                                        f'secondary_study_accession,'
                                        f'sample_accession,'
                                        f'secondary_sample_accession,'
                                        f'experiment_accession,run_accession,'
                                        f'submission_accession,tax_id,'
                                        f'scientific_name,instrument_platform,'
                                        f'instrument_model,library_name,'
                                        f'nominal_length,library_layout,'
                                        f'library_strategy,library_source,'
                                        f'library_selection,read_count,'
                                        f'base_count,center_name,first_public,'
                                        f'last_updated,experiment_title,'
                                        f'study_title,study_alias,'
                                        f'experiment_alias,run_alias,'
                                        f'fastq_bytes,fastq_md5,fastq_ftp,'
                                        f'fastq_aspera,fastq_galaxy,'
                                        f'submitted_bytes,submitted_md5,'
                                        f'submitted_ftp,submitted_aspera,'
                                        f'submitted_galaxy,submitted_format,'
                                        f'sra_bytes,sra_md5,sra_ftp,sra_aspera,'
                                        f'sra_galaxy,cram_index_ftp,'
                                        f'cram_index_aspera,cram_index_galaxy,'
                                        f'sample_alias,broker_name,'
                                        f'sample_title,nominal_sdev,'
                                        f'first_created')
    if experiments_data.status_code != 200:
        return list()
    return experiments_data.json()

if __name__ == "__main__":
    print(f"Running script at {datetime.now()}")
    import_records()