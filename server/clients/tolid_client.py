import requests
import time

def get_tolid(taxid):
    time.sleep(1)
    response = requests.get(f"https://id.tol.sanger.ac.uk/api/v2/species/{taxid}").json()
    if not isinstance(response, list):
        return ''
    else:
        return response[0]['prefix']

