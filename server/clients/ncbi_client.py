import subprocess
import json
import time

TAXID_LIST_LIMIT=50

def get_data_from_ncbi(command):

    CMD = ["datasets", "summary"]

    CMD.extend(command)
    # Execute the script and capture its output
    result = subprocess.run(CMD, capture_output=True, text=True)
    
    # Check if the script executed successfully
    if result.returncode == 0:
        # Load the JSON output into a dictionary
        try:
            output_dict = json.loads(result.stdout)
            return output_dict
        except json.JSONDecodeError as e:
            print("Error decoding JSON:", e)
            return None
    else:
        print("Error executing script:", result.stderr)
        return None
    
def get_taxons_from_ncbi_datasets(taxids):
    # Check if the number of taxids exceeds 1000
    if len(taxids) > TAXID_LIST_LIMIT:
        # Split the taxids into chunks of 1000 or less
        chunks = [taxids[i:i+TAXID_LIST_LIMIT] for i in range(0, len(taxids), TAXID_LIST_LIMIT)]
        
        # Initialize an empty list to store results
        all_results = []
        
        # Iterate over each chunk and make separate requests
        for chunk in chunks:
            query = ['taxonomy', 'taxon', *chunk]
            report = get_data_from_ncbi(query)
            if report:
                all_results.extend(report.get('reports'), [])
            time.sleep(1)
        return all_results
    else:
        query = ['taxonomy', 'taxon', *taxids]
        report = get_data_from_ncbi(query)
        if report:
            return report.get('reports', [])
        # If the number of taxids is 1000 or less, make a single request
        return []
    