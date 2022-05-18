##import data job
from apscheduler.schedulers.background import BackgroundScheduler

from services.organisms_service import get_or_create_organism
from .import_from_NCBI import import_from_NCBI
from .import_from_biosample import import_from_EBI_biosamples
from services.bioproject_service import create_bioproject_from_ENA
from db.models import SecondaryOrganism,Experiment,Organism
from mongoengine.queryset.visitor import Q
from datetime import datetime, timedelta
from utils import ena_client
import os


SAMPLE_QUERY = Q(accession__ne=None) & (Q(last_check=None) | Q(last_check__lte=datetime.now()- timedelta(days=2)))

def import_records():
    PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p]
    ACCESSION = os.getenv('PROJECT_ACCESSION')
    if ACCESSION:
        import_from_NCBI(ACCESSION)
    if PROJECTS:
        import_from_EBI_biosamples(PROJECTS)
    update_samples()


def update_samples():
    samples = SecondaryOrganism.objects(SAMPLE_QUERY)
    if not samples:
        print('NO SAMPLES TO UPDATE')
        return
    print('SAMPLES TO UPDATE: ',len(samples))
    for sample in samples:
        experiments = ena_client.get_reads(sample.accession)
        if not experiments:
            sample.modify(last_check=datetime.utcnow())
            continue
        organism = get_or_create_organism(sample.taxid)
        existing_experiments = Experiment.objects.scalar('experiment_accession')
        for exp in experiments:
            if exp['experiment_accession'] in existing_experiments:
                continue
            exp_obj = Experiment(**exp).save()
            organism.experiments.append(exp_obj)
            sample.experiments.append(exp_obj)
        sample.last_check = datetime.utcnow()
        organism.save()
        sample.save()
        
def handle_tasks():
    PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')
    if PROJECT_ACCESSION:
        create_bioproject_from_ENA(PROJECT_ACCESSION)
        TIME= os.getenv('EXEC_TIME') if os.getenv('EXEC_TIME') else 172800 ##48h hours by default
        sched = BackgroundScheduler(daemon=True)
        sched.add_job(import_records, "interval", id="interval-job", start_date=datetime.now()+timedelta(seconds=20),seconds=int(TIME))
        sched.start()