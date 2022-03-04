##import data job
from .import_from_NCBI import import_from_NCBI
from .import_from_biosample import import_from_EBI_biosamples
from db.models import SecondaryOrganism,Experiment,Organism
from mongoengine.queryset.visitor import Q
from datetime import datetime, timedelta
from utils import ena_client


import os
SAMPLE_QUERY = Q(accession__ne=None) & (Q(last_check=None) | Q(last_check__lte=datetime.now()- timedelta(hours=1)))

def import_records():
    PROJECTS = os.getenv('PROJECTS').split(',')
    print(PROJECTS)
    ACCESSION = os.getenv('PROJECT_ACCESSION')
    if ACCESSION and len(PROJECTS)>0 and PROJECTS[0] != '':
        import_from_NCBI(ACCESSION)
        import_from_EBI_biosamples(PROJECTS)
    elif ACCESSION:
        import_from_NCBI(ACCESSION)
    elif len(PROJECTS)>0:
        import_from_EBI_biosamples(PROJECTS)
    samples = SecondaryOrganism.objects(SAMPLE_QUERY)
    if len(samples) > 0:
        print('SAMPLES TO UPDATE')
        print(len(samples))
        for sample in samples:
            accession = sample.accession
            experiments = ena_client.get_reads(accession)
            if len(experiments) > 0:
                unique_exps=list({v['experiment_accession']:v for v in experiments}.values()) #avoid duplicate records bug in ENA (when ranges are assigned to a biosample)
                existing_exps = Experiment.objects(experiment_accession__in=[exp['experiment_accession'] for exp in unique_exps])
                new_exps = [Experiment(**exp) for exp in unique_exps if exp['experiment_accession'] not in [exp['experiment_accession'] for exp in existing_exps]] if len(existing_exps) > 0 else [Experiment(**exp) for exp in unique_exps]
                if len(new_exps)>0:
                    Experiment.objects.insert(new_exps, load_bulk=False)
                    sample = SecondaryOrganism.objects(accession=accession).first()
                    sample.modify(push_all__experiments=new_exps, last_check=datetime.utcnow())
                    org = Organism.objects(taxid=sample.taxid).first()
                    org.experiments.extend(new_exps)
                    #trigger status update
                    org.save()
    else:
        print('NO SAMPLES TO UPDATE')

        #check for samples between the past 15 days or recently created
    #get orphan samples (those without taxon and organism)
    #and retrieve taxons from sources