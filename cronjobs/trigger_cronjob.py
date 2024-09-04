import requests
import os
import login_to_api
import sys

API_HOST=os.getenv('API_HOST')
API_URL = f"http://{API_HOST}:5000/api"

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')

# Check the number of command-line arguments (including the script name)
num_args = len(sys.argv)

# Access individual command-line arguments by index (0 is the script name)
if num_args <= 1:
    print("No command-line arguments provided.")
else:
    model = sys.argv[1]
    action = sys.argv[2]
    print(f"model is: {model}", f"Action is {action}")
    cookies = login_to_api.login(API_URL)
    crsf = cookies['csrf_access_token']
    headers = {"X-CSRF-TOKEN":crsf}
    response = requests.post(f"{API_URL}/cronjob/{model}/{action}",headers=headers,cookies=cookies)
    print(response.json())
