from db.models import BioSample, Experiment
from services import organisms_service
from utils import ena_client, common_functions
from datetime import datetime
from mongoengine.queryset.visitor import Q
import json

FIELDS_TO_EXCLUDE = ['id','created']

def create_experiments(sample,organism):
    experiments = ena_client.get_reads(sample.accession)
    for exp in experiments:
        if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
            continue
        exp_metadata = dict()
        other_attributes = dict()
        for k in exp.keys():
            if k in ['instrument_model','instrument_platform','experiment_accession']:
                other_attributes[k] = exp[k]
            else:
                exp_metadata[k] = exp[k]
        exp_obj = Experiment(metadata=exp_metadata, taxid=organism.taxid, **other_attributes).save()
        organism.modify(add_to_set__experiments=exp_obj.experiment_accession)
        sample.modify(add_to_set__experiments=exp_obj.experiment_accession)
    sample.last_check = datetime.utcnow()
    sample.save()
    organism.save()


def get_query_filter(filter):
    return (Q(experiment_accession__iexact=filter) | Q(experiment_accession__icontains=filter) | Q(assembly_name__icontains=filter) | Q(assembly_name__iexact=filter) | Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def get_experiments(offset=0,limit=20,filter=None):
    if filter:
        query_filter = get_query_filter(filter)
        items = common_functions.query_search(Experiment,FIELDS_TO_EXCLUDE,query_filter=query_filter)
    else:
        items = common_functions.query_search(Experiment,FIELDS_TO_EXCLUDE)
    json_resp = dict()
    json_resp['total'] = items.count()
    json_resp['data'] = items[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)

def import_experiment_from_accession(accession):

def delete_experiment(accession):
    experiment_to_delete = Experiment.objects(experiment_accession=accession).first()
    organism_to_update = organisms_service.get_or_create_organism(experiment_to_delete.taxid)
    organism_to_update.modify(pull__experiments=accession)
    sample_to_update = BioSample.objects(experiments=accession).update(pull__experiments=accession)
    experiment_to_delete.delete()
    organism_to_update.save()
    return accession