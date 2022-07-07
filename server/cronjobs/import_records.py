from apscheduler.schedulers.background import BackgroundScheduler
from .import_from_NCBI import import_from_NCBI
from .import_from_biosample import import_from_EBI_biosamples
from .update_samples import update_samples
from services.bioproject import create_bioproject_from_ENA
from datetime import datetime, timedelta
import os



def import_records():
    PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p]
    ACCESSION = os.getenv('PROJECT_ACCESSION')
    if ACCESSION:
        import_from_NCBI(ACCESSION)
    if PROJECTS:
        import_from_EBI_biosamples(PROJECTS)
    update_samples()


def handle_tasks():
    PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')
    if PROJECT_ACCESSION:
        create_bioproject_from_ENA(PROJECT_ACCESSION)
    TIME= os.getenv('EXEC_TIME') if os.getenv('EXEC_TIME') else 172800 ##48h hours by default
    sched = BackgroundScheduler(daemon=True)
    sched.add_job(import_records, "interval", id="interval-job", start_date=datetime.now()+timedelta(seconds=20),seconds=int(TIME))
    sched.start()