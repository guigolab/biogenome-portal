import requests
import os
from datetime import datetime, timedelta
import time

API_URL = "http://biogenome_nginx/api"

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
        create_data(url, cookies)
    print("RESPONSE IS:", resp.json())
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

def update_biosamples(cookies):
    biosamples = requests.get(f"{API_URL}/bulk/biosample")
    for biosample in biosamples.json():
        experiments = get_reads(biosample['accession'])
        print(f"experiments for {biosample['accession']}",len(experiments))
        for experiment in experiments:
            accession = experiment['experiment_accession']
            if accession not in biosample['experiments']:
                create_data(f"{API_URL}/experiments/{accession}",cookies)

def get_reads(accession):
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