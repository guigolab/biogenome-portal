from db.models import BioSample, Experiment, Organism
from services import organism,biosample
from utils import ena_client, common_functions
from mongoengine.queryset.visitor import Q
import json



def create_reads_from_biosample_accession(accession):
    response = ena_client.get_reads(accession)
    saved_accessions = list()
    if not response:
        return saved_accessions
    for exp in response:
        if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
            continue
        exp_metadata = dict()
        other_attributes = dict()
        for k in exp.keys():
            if k == 'tax_id':
                other_attributes['taxid'] = exp[k]
            elif k in ['instrument_model','instrument_platform','experiment_accession']:
                other_attributes[k] = exp[k]
            else:
                exp_metadata[k] = exp[k]
        exp_obj = Experiment(metadata=exp_metadata, **other_attributes).save()
        ##create data here
        saved_accessions.append(exp_obj.experiment_accession)
    return saved_accessions

def create_read_from_experiment_accession(accession):
    response = ena_client.get_reads(accession)
    saved_accessions = list()
    resp_obj = dict()
    if not response:
        resp_obj['success'] = False
        resp_obj['message'] = f"{accession} not found in ENA"
        return resp_obj
    for exp in response:
        if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
            resp_obj['success'] = False
            resp_obj['message'] = f"{accession} already exists"
            return resp_obj
        exp_metadata = dict()
        other_attributes = dict()
        for k in exp.keys():
            if k == 'tax_id':
                other_attributes['taxid'] = exp[k]
            elif k in ['instrument_model','instrument_platform','experiment_accession']:
                other_attributes[k] = exp[k]
            else:
                exp_metadata[k] = exp[k]
        organism_obj = organism.get_or_create_organism(other_attributes['taxid'])
        if not organism_obj:
            resp_obj['success'] = False
            resp_obj['message'] = f"organism with taxid: {other_attributes['taxid']} not found"
            return resp_obj
        exp_obj = Experiment(metadata=exp_metadata, **other_attributes).save()
        organism_obj.modify(add_to_set__experiments=exp_obj.experiment_accession)
        organism_obj.save()
        if 'sample_accession' in exp_metadata.keys():
            biosample_obj = biosample.create_biosample_from_accession(exp_metadata['sample_accession'])
            biosample_obj.modify(add_to_set__experiments=exp_obj.experiment_accession)   
        ##create data here
        saved_accessions.append(exp_obj.experiment_accession)
    if saved_accessions:
        resp_obj['success'] = True
        resp_obj['message'] = saved_accessions
        return resp_obj
    resp_obj['success'] = False
    resp_obj['message'] = 'Unhandled error'
    return resp_obj

def delete_experiment(accession):
    experiment_to_delete = Experiment.objects(experiment_accession=accession).first()
    organism_to_update = Organism.objects(taxid=experiment_to_delete.taxid).first()
    organism_to_update.modify(pull__experiments=accession)
    sample_to_update = BioSample.objects(experiments=accession).update(pull__experiments=accession)
    experiment_to_delete.delete()
    organism_to_update.save()
    return accession