import requests

def get_biosamples_from_copo(path, **kwargs):
    base_url = "https://copo-project.org/api"
    response = requests.get(f'{base_url}{path}')
    return response

