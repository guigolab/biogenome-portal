import requests

def get_tolid(taxid):
    data = ""
    try:
        response = requests.get(f"https://id.tol.sanger.ac.uk/api/v2/species/{taxid}")
        response.raise_for_status()
        json_resp = response.json()
        if isinstance(response, list):
            data =  json_resp[0]['prefix']
    except Exception as e:
        print(f"Error retrieving tolid for {taxid}")
        print(e)
    finally:
        return data

