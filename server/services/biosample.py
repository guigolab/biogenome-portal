from db.models import BioSample, Organism
from server.services import geo_localization
from services import organisms_service,experiment_service
from utils import ena_client,utils,common_functions
from utils.common_functions import get_model_objects
from mongoengine.queryset.visitor import Q
import json

FIELDS_TO_EXCLUDE = ['id','created','last_check']

def create_biosample_from_accession(accession):
    if get_model_objects(BioSample,dict(accession=accession)).first():
        return
    biosample_response = ena_client.get_sample_from_biosamples(accession)
    if not biosample_response:
        return
    biosample_obj = create_biosample_from_ebi_data(biosample_response)
    ##create data here
    return biosample_obj
    
def create_biosample_from_ebi_data(sample):
    required_metadata=dict(accession=sample['accession'],taxid=sample['taxId'])
    if 'scientificName' in sample.keys():
        required_metadata['scientific_name'] = sample['scientificName']
    elif 'organism' in sample['characteristics'].keys():
        required_metadata['scientific_name'] = sample['characteristics']['organism'][0]['text']
    else:
        organism = organisms_service.get_or_create_organism(sample['taxId'])
        required_metadata['scientific_name'] = organism.scientific_name
    extra_metadata = utils.parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession','organism']})
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    return new_biosample
    
def get_query_filter(filter):
    return (Q(accession__iexact=filter) | Q(accession__icontains=filter) | Q(scientific_name__icontains=filter))


def get_biosamples(offset=0, limit=20, filter=None):
    if filter:
        query_filter = get_query_filter(filter)
        items = common_functions.query_search(BioSample,FIELDS_TO_EXCLUDE,query_filter=query_filter)
    else:
        items = common_functions.query_search(BioSample,FIELDS_TO_EXCLUDE)
    json_resp = dict()
    json_resp['total'] = items.count()
    json_resp['data'] = items[int(offset):int(offset)+int(limit)].as_pymongo()
    return json.dumps(json_resp)


def delete_biosample(accession):
    biosample_to_delete = get_model_objects(BioSample,dict(accession=accession)).first()
    if not biosample_to_delete:
        return
    samples_to_update = get_model_objects(BioSample,dict(sub_samples=accession)).update(pull__sub_samples=accession)

    organism_to_update = get_model_objects(Organism,dict(taxid=biosample_to_delete.taxid))
    if organism_to_update:
        organism_to_update.modify(pull__biosamples=accession)
        organism_to_update.save()

    biosample_to_delete.delete()

    return accession