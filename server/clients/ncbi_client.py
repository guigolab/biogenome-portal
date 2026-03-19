import subprocess
import json

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

def stream_data_from_ncbi(command):
    CMD = ["datasets", "summary"]
    CMD.extend(command)
    result = subprocess.run(CMD, capture_output=True, text=True)
    if result.returncode == 0:
        return result.stdout
    else:
        print("Error executing script:", result.stderr)
        return None


def query_datasets_to_file(command, output_path):
    """
    Run the datasets CLI and write the response directly to a file.
    Streams stdout to the file without loading the full response into memory.
    """
    CMD = ["datasets", "summary"]
    CMD.extend(command)
    with open(output_path, "w", encoding="utf-8") as f:
        result = subprocess.run(
            CMD,
            stdout=f,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
        )
    if result.returncode == 0:
        return output_path
    if result.stderr:
        print("Error executing datasets CLI:", result.stderr)
    return None
