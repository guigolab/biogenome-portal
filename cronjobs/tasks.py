import requests
import os
from datetime import datetime
import time

PROXY_HOST=os.getenv('PROXY_HOST')

API_URL = f"http://{PROXY_HOST}/api"

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')

##add db model for cronjob, to check job status before trigger the job again

#return cookies
def login():
    session = requests.Session()
    login_data = {"name": username,"password":password }
    response = session.post(f"{API_URL}/login", data=login_data)
    if response.status_code != 200:
        print('LOGIN ERROR')
        return
    return session.cookies.get_dict()

def create_data(url,cookies,to_delete=False):
    crsf = cookies['csrf_access_token']
    headers = {"X-CSRF-TOKEN":crsf}
    if to_delete:
        resp = requests.delete(url,headers=headers,cookies=cookies)
    else:
        resp = requests.post(url,headers=headers,cookies=cookies)
    if resp.status_code == 401:
        cookies = login()
        create_data(url, cookies, to_delete)
    print("RESPONSE IS:", resp.text)
    return

def import_records():
    cronjob_exists = requests.get(f"{API_URL}/cronjob").json()
    if cronjob_exists:
        print('A CRONJOB IS RUNNING ALREADY')
        return
    ##login to create token
    cookies = login()
    if not cookies:
        print('AUTH ERROR')
        return
    ##create cronjob object
    create_data(f"{API_URL}/cronjob",cookies)
    PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p] if os.getenv('PROJECTS') else None
    ACCESSION = os.getenv('PROJECT_ACCESSION')
    if ACCESSION:
        import_from_NCBI(ACCESSION,cookies)
    if PROJECTS:
        import_from_EBI_biosamples(PROJECTS,cookies)
    ##check new reads
    update_biosamples(cookies)
    create_data(f"{API_URL}/cronjob",cookies, to_delete=True)

    ##TODO convert local samples to biosample via copo api

def import_from_NCBI(project_accession,cookies):
    try:
    #get existing assemblies
        assemblies = requests.get(f"{API_URL}/bulk/assembly")
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
            create_data(f"{API_URL}/assemblies/{accession}",cookies)
        print("assemblies length",len(assemblies))
    except:
        print("ERROR IN ASSEMBLIES IMPORT")
        create_data(f"{API_URL}/cronjob",cookies, to_delete=True)


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

def import_from_EBI_biosamples(PROJECTS,cookies):
    try:
        print('STARTING IMPORT BIOSAMPLES JOB')
        project_mapper = {p.split('_')[0]:p.split('_')[1] for p in PROJECTS}
        sample_dict = collect_samples(project_mapper.keys()) ##return dict with project names as keys
        ##get biosamples
        # sub_samples = list()
        biosamples = requests.get(f"{API_URL}/bulk/biosample")
        if biosamples.status_code != 200:
            print('API ERROR, UNABLE TO RETRIEVE BIOSAMPLES')
            return
        if not biosamples.json():
            print('NO BIOSAMPLES PRESENT IN DB')
            existing_biosamples = list()
        else:
            existing_biosamples = [sample['accession'] for sample in biosamples.json()]
        for project in sample_dict.keys():
            for sample in sample_dict[project]:
                accession = sample['accession']
                if accession in existing_biosamples:
                    continue
                create_data(f"{API_URL}/biosamples/{accession}",cookies)
        print('DATA FROM ENA/BIOSAMPLES IMPORTED')
    except:
        print("ERROR IN BIOSAMPLES IMPORT")
        create_data(f"{API_URL}/cronjob",cookies, to_delete=True)

def collect_samples(PROJECTS):
    samples = dict()
    for project in PROJECTS:
        biosamples = get_biosamples_from_biosamples_ebi(project)
        print('lenght ebi biosamples of ',project, len(biosamples))
        if biosamples:
            samples[project] = biosamples
    return samples

def get_biosamples_from_biosamples_ebi(project_name):
    biosamples = []
    href = f"https://www.ebi.ac.uk/biosamples/samples?size=200&filter=attr%3Aproject%20name%3A{project_name}"
    resp = requests.get(href).json()
    while 'next' in resp['_links'].keys():
        href=resp['_links']['next']['href']
        biosamples.extend(resp['_embedded']['samples'])
        resp = requests.get(href).json()
    return biosamples

def update_biosamples(cookies):
    biosamples = requests.get(f"{API_URL}/bulk/biosample")
    existing_experiments = requests.get(f"{API_URL}/bulk/experiment").json()
    existing_accessions = [exp['experiment_accession'] for exp in existing_experiments] if len(existing_experiments) else []
    for biosample in biosamples.json():
        if biosample["experiments"]:
            continue
        try:
            experiments = get_reads(biosample['accession'])
        except:
            print("ERROR IN EXPERIMENTS IMPORT")
            create_data(f"{API_URL}/cronjob",cookies, to_delete=True)
        for experiment in experiments:
            accession = experiment['experiment_accession']
            if accession not in biosample['experiments'] and accession not in existing_accessions:
                create_data(f"{API_URL}/reads/{accession}",cookies)

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