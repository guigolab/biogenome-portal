import requests
import time

def get_taxon_from_ena(taxon_id):
    time.sleep(1)
    response = requests.get(f"https://www.ebi.ac.uk/ena/browser/api/xml/{taxon_id}?download=false") ## 
    if response.status_code != 200:
        return
    return response.content

def check_taxons_from_NCBI(taxids):
    time.sleep(1)
    params = ','.join(taxids)
    response = requests.get(f'https://api.ncbi.nlm.nih.gov/datasets/v1/taxonomy/taxon/{params}')
    if response.status_code != 200:
        return
    return response.json()

def get_sample_from_biosamples(accession):
    time.sleep(1)
    response = requests.get(f"https://www.ebi.ac.uk/biosamples/samples?size=10&filter=acc:{accession}").json()
    if '_embedded' in response.keys() and 'samples' in response['_embedded'] and response['_embedded']['samples']:
        return response['_embedded']['samples'][0]

def get_samples_derived_from(accession):
    biosamples=[]
    href=f"https://www.ebi.ac.uk/biosamples/samples?size=200&filter=attr%3Asample%20derived%20from%3A{accession}"
    resp = requests.get(href).json()
    while 'next' in resp['_links'].keys():
        href=resp['_links']['next']['href']
        biosamples.extend(resp['_embedded']['samples'])
        resp = requests.get(href).json()
    return biosamples
    
def get_tolid(taxid):
    time.sleep(1)
    response = requests.get(f"https://id.tol.sanger.ac.uk/api/v2/species/{taxid}").json()
    if not isinstance(response, list):
        return ''
    else:
        return response[0]['prefix']

def get_bioproject(project_accession):
    time.sleep(1)
    resp = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/filereport?accession={project_accession}&format=JSON&result=study")
    if resp.status_code != 200:
        return list()
    return resp.json()



def parse_assemblies(accession):
    time.sleep(1)
    assemblies_data = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/"
                                   f"links/sample?format=json"
                                   f"&accession={accession}&result=assembly"
                                   f"&offset=0&limit=1000")
    if assemblies_data.status_code != 200:
        return list()
    return assemblies_data.json()


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

