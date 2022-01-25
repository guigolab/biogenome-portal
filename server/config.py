import os

class BaseConfig(object):
    SECRET_KEY = os.environ['SECRET_KEY']
    DEBUG = True
    MONGODB_DB = os.environ['DB_NAME']
    MONGODB_HOST = os.environ['DB_HOST']
    MONGODB_PORT = int(os.environ['DB_PORT'])
    MONGODB_USERNAME = os.environ['DB_USER']
    MONGODB_PASSWORD = os.environ['DB_PASS']
