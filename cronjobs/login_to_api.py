import requests
import os

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
