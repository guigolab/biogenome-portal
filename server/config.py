import os

_BASE_DIR = os.path.dirname(os.path.abspath(__file__))


class BaseConfig(object):
    MONGODB_DB = os.environ['DB_NAME']
    MONGODB_HOST = os.environ['DB_HOST']
    MONGODB_PORT = int(os.environ['DB_PORT'])
    MONGODB_USERNAME = os.environ['DB_USER']
    MONGODB_PASSWORD = os.environ['DB_PASS']
    JWT_SECRET_KEY = os.environ['JWT_SECRET_KEY']
    CELERY_RESULT_BACKEND = os.environ['CELERY_RESULT_BACKEND']
    CELERY_BROKER_URL = os.environ['CELERY_BROKER_URL']
    # Path inside the container / checkout; override via env. Docker Compose can bind-mount over this path.
    CELERY_BEAT_SCHEDULE_FILE = os.environ.get(
        "CELERY_BEAT_SCHEDULE_FILE",
        os.path.join(_BASE_DIR, "celery_beat_schedule.json"),
    )