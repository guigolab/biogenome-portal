from db.models import BioSample, Experiment, Organism
from errors import NotFound
from ..biosample import biosamples_service
from ..organism import organisms_service
from ..utils import ena_client
from mongoengine.queryset.visitor import Q
from datetime import datetime

def get_reads(offset=0,limit=20,
                filter=None, filter_option="scientific_name",
                start_date=None, end_date=datetime.utcnow,
                sort_column=None,sort_order=None, center=None):
    query = dict()
    if center:
        query['metadata__center_name'] = center
    if filter:
        filter_query = get_filter(filter,filter_option)
    else:
        filter_query = None
    if start_date:
        date_query = (Q(metadata__first_created__gte=start_date) & Q(metadata__first_created__lte=end_date))
    else:
        date_query = None
    if filter_query and date_query:
        reads = Experiment.objects(filter_query & date_query, **query).exclude('id','created')
    elif filter_query:
        reads = Experiment.objects(filter_query,**query).exclude('id','created')
    elif date_query:
        reads = Experiment.objects(date_query,**query).exclude('id','created')
    else:
        reads = Experiment.objects(**query).exclude('id','created')
    if sort_column and sort_column == "first_created":
        sort_column = 'metadata.first_created'
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        reads = reads.order_by(sort)
    return reads.count(), reads[int(offset):int(offset)+int(limit)]

def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'instrument_platform':
        return (Q(instrument_platform__iexact=filter) | Q(instrument_platform__icontains=filter))
    elif option == 'experiment_title':
        return (Q(metadata__experiment_title__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def create_read_from_experiment_accession(accession):
    response = ena_client.get_reads(accession)
    saved_accessions = list()
    resp_obj = dict()
    if not response:
        resp_obj['message'] = f"{accession} not found in INSDC"
        resp_obj['status'] = 400
        return resp_obj
    for exp in response:
        if Experiment.objects(experiment_accession=exp['experiment_accession']).first():
            resp_obj['message'] = f"{accession} already exists"
            resp_obj['status'] = 400
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
        organism_obj = organisms_service.get_or_create_organism(other_attributes['taxid'])
        if not organism_obj:
            resp_obj['message'] = f"organism with taxid: {other_attributes['taxid']} not found"
            resp_obj['status'] = 400
            return resp_obj
        if 'sample_accession' in exp_metadata.keys():
            biosamples_service.create_related_biosample(exp_metadata['sample_accession'])
        exp_obj = Experiment(metadata=exp_metadata, **other_attributes).save()
        organism_obj.modify(add_to_set__experiments=exp_obj.experiment_accession)
        organism_obj.save()
        ##create data here
        saved_accessions.append(exp_obj.experiment_accession)
    if saved_accessions:
        resp_obj['message'] = saved_accessions
        resp_obj['status'] = 201
        return resp_obj
    resp_obj['message'] = 'Unhandled error'
    resp_obj['status'] = 500
    return resp_obj

def delete_experiment(accession):
    experiment_to_delete = Experiment.objects(experiment_accession=accession).first()
    if not experiment_to_delete:
        raise NotFound
    biosample = BioSample.objects(accession=experiment_to_delete.metadata['sample_accession']).first()
    biosample.modify(pull__experiments=experiment_to_delete.experiment_accession)
    organism = Organism.objects(taxid=biosample.taxid).first()
    organism.modify(pull__experiments=experiment_to_delete.experiment_accession)
    organism.save()
    experiment_to_delete.delete()
    return accession