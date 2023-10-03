import os
from mongoengine import connect, disconnect

PROXY_HOST=os.getenv('PROXY_HOST')

API_URL = f"http://{PROXY_HOST}/api"

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')
DB_HOST = os.environ.get('DB_PROD_HOST', os.environ['DB_HOST'])
DB_NAME = os.getenv('DB_NAME')
DB_PORT = int(os.getenv('DB_PORT'))
MONGO_INITDB_ROOT_USERNAME = os.getenv('MONGO_INITDB_ROOT_USERNAME')
MONGO_INITDB_ROOT_PASSWORD = os.getenv('MONGO_INITDB_ROOT_PASSWORD')

def connect_to_db():
    connect(DB_NAME, host=DB_HOST,port=DB_PORT, username=MONGO_INITDB_ROOT_USERNAME, password=MONGO_INITDB_ROOT_PASSWORD, authentication_source='admin')

def disconnect_from_db():
    disconnect()