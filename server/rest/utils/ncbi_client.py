import requests
import time


def get_assembly(assembly_accession):
    time.sleep(1)
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/accession/{assembly_accession}").json()
    if not 'assemblies' in result.keys():
        return 
    return result['assemblies'][0]['assembly'] ##return first match

def get_taxons(taxids):
    query = ','.join(taxids)
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/taxonomy/taxon/{query}").json()
    return result.get('taxonomy_nodes')

def get_assemblies(project_accession):
    assemblies=list()
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&page_size=100").json()
    counter = 1
    if 'assemblies' in result.keys():
        while 'next_page_token' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
            next_page_token = result['next_page_token']
            #max 3 requests per second without auth token
            if counter >= 3:
                time.sleep(1)
                counter = 0
            result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&page_size=100&page_token={next_page_token}").json()
            counter+=1
        if 'assemblies' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
    return assemblies

def get_taxon(taxid):
    response = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/taxonomy/taxon/{taxid}")
    return response.json().get('taxonomy_nodes')

def get_lineage(lineage):
    response = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/taxonomy/taxon/{','.join(lineage)}")
    return response.json().get('taxonomy_nodes')