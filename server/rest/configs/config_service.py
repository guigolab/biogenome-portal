import os
import json
from werkzeug.exceptions import NotFound, Forbidden, BadRequest, InternalServerError

CONFIG_PATH= os.getenv('CONFIG_PATH')

def load_json_config():
    """
    Load all JSON files from a given directory into a Python dictionary.
    Returns:
        dict: A dictionary with file names (without extensions) as keys
              and JSON content as values.
    """
    config_data = {}

    if not os.path.exists(CONFIG_PATH):
        raise NotFound(f"Directory {CONFIG_PATH} does not exist.")

    if not os.access(CONFIG_PATH, os.R_OK):
        raise Forbidden(f"Permission denied to access directory {CONFIG_PATH}.")

    # Iterate over files in the directory
    for file_name in os.listdir(CONFIG_PATH):
        # Check if the file has a .json extension
        if file_name.endswith('.json'):
            file_path = os.path.join(CONFIG_PATH, file_name)
            try:
                # Read and parse the JSON file
                with open(file_path, 'r') as json_file:
                    content = json.load(json_file)
                    # Use the file name (without extension) as the key
                    key = os.path.splitext(file_name)[0]
                    config_data[key] = content
            except json.JSONDecodeError as e:
                raise BadRequest(f"Invalid JSON format in file {file_name}: {e}")
            except Exception as e:
                raise InternalServerError(f"Unexpected error reading file {file_name}: {e}")
    return config_data
