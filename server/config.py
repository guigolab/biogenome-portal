import os

class BaseConfig(object):
    MONGODB_DB = os.environ['DB_NAME']
    MONGODB_HOST = os.environ.get('DB_PROD_HOST', os.environ['DB_HOST'])
    MONGODB_PORT = int(os.environ['DB_PORT'])
    MONGODB_USERNAME = os.environ['DB_USER']
    MONGODB_PASSWORD = os.environ['DB_PASS']
    JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
