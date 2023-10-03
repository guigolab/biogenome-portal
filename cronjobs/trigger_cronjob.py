
import requests
import os
import login_to_api
import sys

PROXY_HOST=os.getenv('PROXY_HOST')

API_URL = f"http://{PROXY_HOST}/api"

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')

# Check the number of command-line arguments (including the script name)
num_args = len(sys.argv)

# Access individual command-line arguments by index (0 is the script name)
if num_args <= 1:
    print("No command-line arguments provided.")
else:
    model = sys.argv[1]
    print(f"model is: {model}")
    cronjobs = requests.get(f"{API_URL}/cronjob").json()
    job_exists = False
    for cronjob in cronjobs:
        if cronjob['cronjob_type'] == model:
            job_exists = True
    if not job_exists:
        cookies = login_to_api.login()
        crsf = cookies['csrf_access_token']
        headers = {"X-CSRF-TOKEN":crsf}
        requests.post(f"{API_URL}/cronjob/{model}",headers=headers,cookies=cookies)
        print(f'Creating job: {model}')
    else:
        print(f'Job {model} is already running')
