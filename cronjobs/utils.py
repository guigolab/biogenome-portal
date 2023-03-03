import requests
import os
from datetime import datetime
import time

PROXY_HOST=os.getenv('PROXY_HOST')

API_URL = f"http://{PROXY_HOST}/api"

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')


def login():
    session = requests.Session()
    login_data = {"name": username,"password":password }
    response = session.post(f"{API_URL}/login", data=login_data)
    if response.status_code != 200:
        print('LOGIN ERROR')
        return
    return session.cookies.get_dict()

def trigger_cronjob(model):
    cronjobs = requests.get(f"{API_URL}/cronjob").json()
    for cronjob in cronjobs:
        if cronjob['cronjob_type'] == model:
            return
    cookies = login()
    crsf = cookies['csrf_access_token']
    headers = {"X-CSRF-TOKEN":crsf}
    requests.post(f"{API_URL}/cronjob/{model}",headers=headers,cookies=cookies)
