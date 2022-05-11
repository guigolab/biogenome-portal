##import data job
from .import_from_NCBI import import_from_NCBI
from .import_from_biosample import import_from_EBI_biosamples
from db.models import SecondaryOrganism,Experiment,Organism
from mongoengine.queryset.visitor import Q
from datetime import datetime, timedelta
from utils import ena_client
import os


SAMPLE_QUERY = Q(accession__ne=None) & (Q(last_check=None) | Q(last_check__lte=datetime.now()- timedelta(days=5)))

def import_records():
    PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p]
    ACCESSION = os.getenv('PROJECT_ACCESSION')
    if ACCESSION:
        import_from_NCBI(ACCESSION)
    if len(PROJECTS)>0:
        import_from_EBI_biosamples(PROJECTS)
    update_samples()


def update_samples():
    samples = SecondaryOrganism.objects(SAMPLE_QUERY)
    if not samples:
        print('NO SAMPLES TO UPDATE')
        return
    print('SAMPLES TO UPDATE: ',len(samples))
    for sample in samples:
        accession = sample.accession
        experiments = ena_client.get_reads(accession)
        if not experiments:
            sample.modify(last_check=datetime.utcnow())
            continue
        unique_exps=list({v['experiment_accession']:v for v in experiments}.values()) #avoid duplicate records bug in ENA (when ranges are assigned to a biosample)
        if sample.experiments:
            existing_exps = Experiment.objects(experiment_accession__in=[exp['experiment_accession'] for exp in unique_exps])
            new_exps = [Experiment(**exp) for exp in unique_exps if exp['experiment_accession'] not in [exp['experiment_accession'] for exp in existing_exps]]
        else:
            new_exps = [Experiment(**exp) for exp in unique_exps]
        if not new_exps:
            sample.modify(last_check=datetime.utcnow())
            continue
        Experiment.objects.insert(new_exps, load_bulk=False)
        sample = SecondaryOrganism.objects(accession=accession).first()
        sample.modify(push_all__experiments=new_exps, last_check=datetime.utcnow())
        org = Organism.objects(taxid=sample.taxid).first()
        org.experiments.extend(new_exps)
        #trigger status update
        org.save()
        