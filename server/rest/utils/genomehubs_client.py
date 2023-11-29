import requests

BLOBTOOLKIT_API = "https://blobtoolkit.genomehubs.org/api/v1/search/autocomplete"


def get_blobtoolkit_id(accession):
    return requests.get(f"{BLOBTOOLKIT_API}/{accession}").json()