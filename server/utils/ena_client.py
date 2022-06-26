import requests
from flask import current_app as app, request
import time

def get_taxon_from_ena(taxon_id):
    response = requests.get(f"https://www.ebi.ac.uk/ena/browser/api/xml/{taxon_id}?download=false") ## 
    if response.status_code != 200:
        return
    return response.content

def check_taxons_from_NCBI(taxids):
    params = ','.join(taxids)
    response = requests.get(f'https://api.ncbi.nlm.nih.gov/datasets/v1/taxonomy/taxon/{params}')
    if response.status_code != 200:
        return
    return response.json()

def get_sample_from_biosamples(accession):
    return requests.get(f"https://www.ebi.ac.uk/biosamples/samples?size=1000&filter=acc:{accession}").json()

def get_tolid(taxid):
    response = requests.get(f"https://id.tol.sanger.ac.uk/api/v2/species/{taxid}").json()
    if not isinstance(response, list):
        return ''
    else:
        return response[0]['prefix']

def get_bioproject(project_accession):
    resp = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/filereport?accession={project_accession}&format=JSON&result=study")
    if resp.status_code != 200:
        return list()
    return resp.json()

def get_biosamples_page(url , samples):
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

def get_biosamples(project):
    return get_biosamples_page(f"https://www.ebi.ac.uk/biosamples/samples?size=10000&filter=attr%3Aproject%20name%3A{project}", [])


def parse_assemblies(accession):
    assemblies_data = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/"
                                   f"links/sample?format=json"
                                   f"&accession={accession}&result=assembly"
                                   f"&offset=0&limit=1000")
    if assemblies_data.status_code != 200:
        return list()
    return assemblies_data.json()


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

