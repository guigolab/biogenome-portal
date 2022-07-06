from db.models import BioSample
from server.services import organisms_service,geo_localization_service,experiment_service
from services.assembly_service import get_or_create_assembly
from services.organisms_service import get_or_create_organism
from utils import ena_client,utils,common_functions
from mongoengine.queryset.visitor import Q
import json

FIELDS_TO_EXCLUDE = ['id','created','last_check']

def get_or_create_biosample(accession,organism,assembly):
    sample_obj = BioSample.objects(accession=accession).first()
    ##parse sample
    if not sample_obj:
        required_metadata=dict(accession=accession,taxid=organism.taxid,scientific_name=organism.scientific_name)
        metadata = handle_biosample(assembly,accession)
        sample_obj = BioSample(metadata=metadata, **required_metadata).save()
        parse_sub_samples(sample_obj,organism)
        organism.modify(add_to_set__biosamples=sample_obj.accession)
    return sample_obj

def get_sample_from_assembly(accession, organism, assembly):
    sample_obj = BioSample.objects(accession=accession).first()
    ##parse sample
    if not sample_obj:
        required_metadata=dict(accession=accession,taxid=organism.taxid,scientific_name=organism.scientific_name)
        metadata = handle_biosample(assembly,accession)
        sample_obj = BioSample(metadata=metadata, **required_metadata).save()
        parse_sub_samples(sample_obj,organism)
        organism.modify(add_to_set__biosamples=sample_obj.accession)
    return sample_obj


## create biosample and update organism
def create_biosample_from_biosamples(accession):
    sample = ena_client.get_sample_from_biosamples(accession)
    if not sample:
        return
    sample = sample[0]
    organism = organisms_service.get_or_create_organism(sample['taxId'])
    required_metadata=dict(accession=sample['accession'],taxid=organism.taxid,scientific_name=organism.scientific_name)
    extra_metadata = utils.parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession']})
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    return new_biosample


def handle_relationships(new_biosample,organism):
    if 'sample derived from' in new_biosample.metadata.keys():
        sample_container = get_biosample_from_biosamples(new_biosample.metadata['sample derived from'])

# def create_biosample_relationships(biosample, organism):
#     if 'sample derived from' in biosample.metadata.keys():
#         ## get biosample container
#         biosample_container_metadata = 

def metadata_from_ncbi(biosample_metadata):
    metadata = dict()
    for attr in biosample_metadata['attributes']:
        metadata[attr['name']] = [dict(text=attr['value'])]
    return utils.parse_sample_metadata(metadata)

def handle_biosample(assembly, sample_accession):
    extra_metadata=dict()
    if not 'biosample' in assembly.keys() or not 'attributes' in assembly['biosample'].keys():
        #retrieve sample metadata from EBI/BioSamples
        resp = ena_client.get_sample_from_biosamples(sample_accession)
        extra_metadata = resp['_embedded']['samples'][0]['characteristics'] if '_embedded' in resp.keys() else dict()
    else:
        biosample_metadata = assembly['biosample']
        for attr in biosample_metadata['attributes']:
            extra_metadata[attr['name']] = [dict(text=attr['value'])]
    return utils.parse_sample_metadata(extra_metadata)


def parse_biosample_metadata(sample_accession,assembly=None):
    extra_metadata=dict()
    if assembly and 'biosample' in assembly.keys() and 'attributes' in assembly['biosample'].keys():
        #retrieve sample metadata from EBI/BioSamples
        biosample_metadata = assembly['biosample']
        for attr in biosample_metadata['attributes']:
            extra_metadata[attr['name']] = [dict(text=attr['value'])]
    else:
        resp = ena_client.get_sample_from_biosamples(sample_accession)
        biosample_metadata = common_functions.biosamples_response_parser(resp)
        extra_metadata = biosample_metadata[0]['characteristics'] if biosample_metadata else dict()
    return utils.parse_sample_metadata(extra_metadata)


def create_biosample_from_biosamples(sample,organism,sub_samples):
    required_metadata=dict(accession=sample['accession'],taxid=organism.taxid,scientific_name=organism.scientific_name)
    extra_metadata = utils.parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession']})
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    if 'sample derived from' in new_biosample.metadata.keys():
        sub_samples.append(new_biosample)
    else:
        parse_sub_samples(new_biosample,organism)
        organism.modify(add_to_set__biosamples=new_biosample.accession)
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

def parse_sub_samples(biosample, organism):
    biosamples_response = ena_client.get_samples_derived_from(biosample.accession)
    sub_samples_to_parse = common_functions.biosamples_response_parser(biosamples_response)
    if not sub_samples_to_parse:
        return
    for sample in sub_samples_to_parse:
        new_sub_sample = create_biosample_from_biosamples(sample,organism, list())
        experiment_service.create_experiments(new_sub_sample,organism)
        biosample.modify(add_to_set__sub_samples=new_sub_sample.accession)

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