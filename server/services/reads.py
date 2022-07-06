from db.models import BioSample, Experiment, Organism
from services import organisms_service
from utils import ena_client, common_functions
from utils.common_functions import get_model_objects
from mongoengine.queryset.visitor import Q
import json

FIELDS_TO_EXCLUDE = ['id','created']

##biosample accession or experiment accession
def create_reads_from_accession(accession):
    response = ena_client.get_reads(accession)
    saved_accessions = list()
    if not response:
        return
    for exp in response:
        if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
            continue
        exp_metadata = dict()
        other_attributes = dict()
        for k in exp.keys():
            if k in ['instrument_model','instrument_platform','experiment_accession','tax_id']:
                other_attributes[k] = exp[k]
            else:
                exp_metadata[k] = exp[k]
        exp_obj = Experiment(metadata=exp_metadata, **other_attributes).save()
        ##create data here
        saved_accessions.append(exp['experiment_accession'])
    return saved_accessions

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

def delete_experiment(accession):
    experiment_to_delete = Experiment.objects(experiment_accession=accession).first()
    organism_to_update = Organism.objects(taxid=experiment_to_delete.taxid)
    organism_to_update.modify(pull__experiments=accession)
    sample_to_update = BioSample.objects(experiments=accession).update(pull__experiments=accession)
    experiment_to_delete.delete()
    organism_to_update.save()
    return accession