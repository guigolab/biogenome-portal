import os
from celery import Celery
from jobs import assemblies
import app

celery = Celery('tasks', broker=os.environ.get("CELERY_RESULT_BACKEND", "redis://localhost:6379"), backend=os.environ.get("CELERY_BROKER_URL", "redis://localhost:6379"))

celery.conf.update(app.config)


@celery.task(name='import_assemblies')
def import_assemblies():
    assemblies.import_assemblies_by_bioproject()