import requests
import os

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')


def login(host):
    session = requests.Session()
    login_data = {"name": username,"password":password }
    response = session.post(f"{host}/login", data=login_data)
    if response.status_code != 200:
        print('LOGIN ERROR')
        return
    return session.cookies.get_dict()
