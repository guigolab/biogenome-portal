from db.models import BioSample
from server.services import organisms_service,geo_localization_service,experiment_service
from server.services.biosample_service import handle_relationships
from server.utils import ncbi_client
from services.assembly_service import get_or_create_assembly
from services.organisms_service import get_or_create_organism
from utils import ena_client,utils,common_functions
from mongoengine.queryset.visitor import Q
import json

FIELDS_TO_EXCLUDE = ['id','created','last_check']

## 1) parse metadata from ncbi or ebi
# 2) retrieve sample from ebi
## 3)
###
###
#
def import_biosample_from_accession(accession, get_related=False):
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return

    sample_resp = ena_client.get_sample_from_biosamples(accession)
    if not sample_resp:
        return

    sample = sample_resp[0]
    biosample_obj = create_biosample(sample)
    if get_related:
        handle_relationships(biosample_obj)

def handle_relationships(biosample):
    if 'sample derived from' in biosample.metadata.keys():
        ## get biosample container
        biosample_container_metadata = import_biosample_from_accession(biosample.metadata['sample derived from'])
        
    else:
        ##check if sample has sub_samples
        sub_samples = ena_client.get_samples_derived_from(biosample.accession)
        for sample in sub_samples:
            sub_sample_obj = create_biosample(sample)



##create biosample object
def create_biosample(sample):
    required_metadata=dict(accession=sample['accession'],taxid=sample['taxId'])
    if 'scientificName' in sample.keys():
        required_metadata['scientific_name'] = sample['scientificName']
    elif 'organism' in sample['characteristics'].keys():
        required_metadata['scientific_name'] = sample['characteristics']['organism'][0]['text']
    else:
        organism = get_or_create_organism(sample['taxId'])
        required_metadata['scientific_name'] = organism.scientific_name
    extra_metadata = utils.parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession','organism']})
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    return new_biosample

def get_or_create_biosample(accession, ncbi_metadata=None, get_related=False):
    biosample = BioSample.objects(accession=accession).first()
    if biosample:
        return biosample
    if ncbi_metadata:
        extra_metadata = 

def create_biosample_from_ncbi(accession,organism,assembly,get_related=False):
    required_metadata=dict(accession=accession,taxid=organism.taxid,scientific_name=organism.scientific_name)
    if 'biosample' in assembly.keys() and 'attributes' in assembly['biosample'].keys():
        extra_metadata = metadata_from_ncbi(assembly['biosample']['attributes'])    
        new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
        if get_related:
            handle_relationships(new_biosample)
    else:
        new_biosample = create_biosample_from_ebi(accession, get_related)
    return new_biosample

def create_biosample_from_ebi(accession,get_related=False):
    sample_resp = ena_client.get_sample_from_biosamples(accession)
    if not sample_resp:
        return
    sample = sample_resp[0]
    required_metadata=dict(accession=sample['accession'],taxid=sample['taxId'])
    if 'scientificName' in sample.keys():
        required_metadata['scientific_name'] = sample['scientificName']
    elif 'organism' in sample['characteristics'].keys():
        required_metadata['scientific_name'] = sample['characteristics']['organism'][0]['text']
    else:
        organism = get_or_create_organism(sample['taxId'])
        required_metadata['scientific_name'] = organism.scientific_name
    extra_metadata = utils.parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession','organism']})
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    if get_related:
        handle_relationships(new_biosample)
    return new_biosample


def parse_sub_samples(biosample, organism):
    biosamples_response = ena_client.get_samples_derived_from(biosample.accession)
    sub_samples_to_parse = common_functions.biosamples_response_parser(biosamples_response)
    if not sub_samples_to_parse:
        return
    for sample in sub_samples_to_parse:
        new_sub_sample = create_biosample_from_biosamples(sample,organism, list())
        experiment_service.create_experiments(new_sub_sample,organism)
        biosample.modify(add_to_set__sub_samples=new_sub_sample.accession)



def metadata_from_ncbi(biosample_metadata):
    metadata = dict()
    for attr in biosample_metadata['attributes']:
        metadata[attr['name']] = [dict(text=attr['value'])]
    return utils.parse_sample_metadata(metadata)

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

def create_biosample_from_accession(accession, import_related=False):
    ##retrieve assembly data by sample accession from ena
    assembly_data = ena_client.parse_assemblies(accession)
    if assembly_data:
        ##create data
        for assembly in assembly_data:
            get_or_create_assembly(assembly['accession'])
        sample_obj = BioSample.objects(accession=accession).first()
        return sample_obj
    biosample_obj = create_biosample_from_biosamples(accession)
    if not biosample_obj:
        return
    biosamples_response = ena_client.get_sample_from_biosamples(accession)
    sample_to_save = common_functions.biosamples_response_parser(biosamples_response)
    if not sample_to_save:
        return
    sub_samples = list()
    organism = organisms_service.get_or_create_organism(sample_to_save['taxId'])
    sample_obj = create_biosample_from_biosamples(sample_to_save,organism,sub_samples)
    if sub_samples:
        for sub_sample in sub_samples:
            sample_container_data = ena_client.get_sample_from_biosamples(sub_sample['metadata']['sample derived from'])
            if not sample_container_data and not '_embedded' in sample_container_data.keys():
                return
            sample_container_to_save = sample_container_data['_embedded']['samples'][0]
            sample_container_obj = create_biosample_from_biosamples(sample_container_to_save,organism,list())
            
    geo_localization_service.get_or_create_coordinates(sample_obj,organism)
    experiment_service.create_experiments(sample_obj,organism)
    return sample_obj

def delete_biosample(accession):
    biosample_to_delete = BioSample.objects(accession=accession).first()

    samples_to_update = BioSample.objects(sub_samples=accession).update(pull__sub_samples=accession)

    organism_to_update = get_or_create_organism(biosample_to_delete.taxid)
    if organism_to_update:
        organism_to_update.modify(pull__biosamples=accession)
        organism_to_update.save()

    biosample_to_delete.delete()

    return accession