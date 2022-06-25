from db.models import Experiment
from utils import ena_client
from datetime import datetime

def create_experiments(sample,organism):
    experiments = ena_client.get_reads(sample.accession)
    for exp in experiments:
        if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
            continue
        exp_metadata = dict()
        for k in exp.keys():
            if k != 'experiment_accession':
                exp_metadata[k] = exp[k]
        exp_obj = Experiment(experiment_accession= exp['experiment_accession'], metadata=exp_metadata, taxid=organism.taxid).save()
        organism.modify(add_to_set__experiments=exp_obj.experiment_accession)
        sample.modify(add_to_set__experiments=exp_obj.experiment_accession)
    sample.last_check = datetime.utcnow()
