import subprocess
import json
import os
import tempfile
import time

TAXID_LIST_LIMIT=40

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
    if len(taxids) <= TAXID_LIST_LIMIT:

        with tempfile.NamedTemporaryFile(delete=False, mode='w') as temp_file:
            temp_file_path = temp_file.name
            # Write each taxonomic ID to the file
            for tax_id in taxids:
                temp_file.write(f"{tax_id}\n")

            query = ['taxonomy', 'taxon', '--inputfile', str(temp_file_path)]
            report = get_data_from_ncbi(query)

        os.remove(temp_file_path)
        if report:
            return report.get('reports', [])
        return []
    else:
        chunks = [taxids[i:i+TAXID_LIST_LIMIT] for i in range(0, len(taxids), TAXID_LIST_LIMIT)]
        
        print(f"Created a total of {len(chunks)} chunks of length <= {TAXID_LIST_LIMIT} to retrieve")

        all_results=[]
        path = "taxid-list.txt"
        for chunk in chunks:
            with open(path, mode="w") as file:
                file.seek(0)
                file.writelines([f"{taxid}\n" for taxid in chunk])
                file.seek(0)

            query = ['taxonomy', 'taxon','--inputfile', path]
            
            report = get_data_from_ncbi(query)
                
            if report:
                all_results.extend(report.get('reports',[]))

            print("RESULTS LENGTH IS: ", len(all_results))

            time.sleep(1.5)
        return all_results  
    