import subprocess
import json

CMD = ["../datasets", "summary"]


def rehydrate_ncbi_datasets():
    subprocess.run(["../datasets", "rehydrate"])

def get_genomes_from_ncbi(accession, *args):

    cmd = CMD.extend(["genome", "accession"])

    args = ["PRJNA533106", "--assembly-source", "GenBank" ,"--limit", "10"]
    # Execute the script and capture its output
    result = subprocess.run(cmd.extend(args), capture_output=True, text=True)
    
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


def get_taxons_from_ncbi(taxons, *args):

    cmd = CMD.extend(["taxonomy", "taxon"])

    args = ["--parents"]
    # Execute the script and capture its output
    result = subprocess.run(cmd.extend(args), capture_output=True, text=True)
    
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