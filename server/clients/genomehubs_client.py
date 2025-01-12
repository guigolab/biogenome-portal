import requests

BLOBTOOLKIT_API = "https://blobtoolkit.genomehubs.org/api/v1/search/autocomplete"

def get_blobtoolkit_id(accession):
    response = None
    try:
        response = requests.get(f"{BLOBTOOLKIT_API}/{accession}").json()
    except Exception as e:
        print(f"Error retrieving blobtoolkit id from {accession}")
        print(e)
    finally:
        return response
