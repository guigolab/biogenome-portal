import requests
import time
import csv


EXPERIMENT_FIELDS = (
    'study_accession,secondary_study_accession,sample_accession,'
    'secondary_sample_accession,experiment_accession,run_accession,'
    'submission_accession,tax_id,scientific_name,instrument_platform,'
    'instrument_model,library_name,nominal_length,library_layout,'
    'library_strategy,library_source,library_selection,read_count,'
    'base_count,center_name,first_public,last_updated,experiment_title,'
    'study_title,study_alias,experiment_alias,run_alias,fastq_bytes,'
    'fastq_md5,fastq_ftp,fastq_aspera,fastq_galaxy,submitted_bytes,'
    'submitted_md5,submitted_ftp,submitted_aspera,submitted_galaxy,'
    'submitted_format,sra_bytes,sra_md5,sra_ftp,sra_aspera,sra_galaxy,'
    'sample_alias,broker_name,sample_title,nominal_sdev,first_created'
)


def fetch_experiments_by_bioproject_streaming(project_accession):
    base_url = "https://www.ebi.ac.uk/ena/portal/api/filereport"
    params = {
        "result": "read_run",
        "accession": project_accession,
        "fields": EXPERIMENT_FIELDS,
        "format": "tsv",
        "download": "false"
    }

    try:
        response = requests.get(base_url, params=params, stream=True)
        response.raise_for_status()

        # Initialize a reader for the streamed response content
        lines = (line.decode('utf-8') for line in response.iter_lines())
        reader = csv.DictReader(lines, delimiter='\t')

        for row in reader:
            yield row
    except Exception as e:
        print(f"Error occurred while fetching experiments for {project_accession}")
        print(e)


def get_taxon_from_ena_browser(taxon_id):
    data=None
    try:
        response = requests.get(f"https://www.ebi.ac.uk/ena/browser/api/xml/{taxon_id}") ## 
        response.raise_for_status()
        data = response.content
    except Exception as e:
        print(f"Error occurred while fetchin {taxon_id}")
        print(e)
    finally:
        return data

def get_objects_from_ena_browser(accessions):
    data=None
    try:
        payload = {
            "accessions": accessions,
        }
        response = requests.post("https://www.ebi.ac.uk/ena/browser/api/xml", data=payload)
        response.raise_for_status()
        data = response.content
    except Exception as e:
        print(f"Error occurred while fetchin {accessions}")
        print(e)
    finally:
        return data

def get_taxon_from_ena_portal(taxon_id):
    data = None
    try:
        response = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/filereport?result=taxon&accession={taxon_id}&fields=tax_lineage,scientific_name,common_name,genbank_common_name,rank&limit=10&format=json")
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Error occurred while fetchin {taxon_id}")
        print(e)
    finally:
        return data

def get_sample_from_biosamples(accession):
    data = None
    try:

        response = requests.get(f"https://www.ebi.ac.uk/biosamples/samples?size=10&filter=acc:{accession}")
        json_response = response.json()
        if '_embedded' in json_response.keys() and 'samples' in json_response['_embedded'] and json_response['_embedded']['samples']:
            data =  json_response['_embedded']['samples'][0]
    except Exception as e:
        print(f"Error occurred while fetchin {accession}")
        print(e)
    finally:
        return data

def get_samples_derived_from(accession):
    time.sleep(1)
    biosamples=[]
    href=f"https://www.ebi.ac.uk/biosamples/samples?size=200&filter=attr%3Asample%20derived%20from%3A{accession}"
    resp = requests.get(href).json()
    while 'next' in resp['_links'].keys():
        href=resp['_links']['next']['href']
        biosamples.extend(resp['_embedded']['samples'])
        resp = requests.get(href).json()
    return biosamples
    
def get_reads(accession):
    try:
        experiments_data = requests.get(f'https://www.ebi.ac.uk/ena/portal/'
                                            f'api/filereport?result=read_run'
                                            f'&accession={accession}'
                                            f'&limit=0&format=json'
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
                                            f'sra_galaxy,sample_alias,broker_name,'
                                            f'sample_title,nominal_sdev,first_created')
        experiments_data.raise_for_status()
        response = experiments_data.json()
    except:
        response = None
    finally:
        return response

def fetch_biosamples_from_ebi(url):
    biosamples = []
    try:
        response = requests.get(url).json()
        biosamples = response.get('_embedded', {}).get('samples', [])
        if 'next' in response.get('_links', {}):
            url = response['_links']['next']['href']
        else:
            url = None
    except Exception as e:
        print(f"Error fetching samples")
        print(e)
    finally:
        return biosamples, url