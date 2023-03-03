from db.models import BioSample
from errors import NotFound
from ..utils import ena_client
from ..organism import organisms_service
from datetime import datetime
from mongoengine.queryset.visitor import Q
import os

PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p] if os.getenv('PROJECTS') else None


def get_biosamples(offset=0,limit=20,
                    filter=None, filter_option="scientific_name",
                    start_date=None, end_date=datetime.utcnow,
                    sort_column=None, sort_order=None):
    if filter:
        filter_query = get_filter(filter,filter_option)
    else:
        filter_query = None
    if start_date:
        date_query = (Q(metadata__collection_date__gte=start_date) & Q(metadata__collection_date__lte=end_date))
    else:
        date_query = None
    if filter_query and date_query:
        biosamples = BioSample.objects(filter_query & date_query).exclude('id','created')
    elif filter_query:
        biosamples = BioSample.objects(filter_query).exclude('id','created')
    elif date_query:
        biosamples = BioSample.objects(date_query).exclude('id','created')
    else:
        biosamples = BioSample.objects().exclude('id','created')
    if sort_column:
        if sort_column == 'collection_date':
            sort_column = 'metadata.collection_date'
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        biosamples = biosamples.order_by(sort)
    return biosamples.count(), biosamples[int(offset):int(offset)+int(limit)]

def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'habitat':
        return (Q(metadata__habitat__iexact=filter) | Q(metadata__habitat__icontains=filter))
    elif option == 'gal':
        return (Q(metadata__GAL__iexact=filter) | Q(metadata__GAL__icontains=filter))
    elif option == 'accession':
        return (Q(accession__iexact=filter) | Q(accession__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def create_related_biosample(accession):
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return biosample_obj
    biosample_response = ena_client.get_sample_from_biosamples(accession)
    if not biosample_response:
        return
    biosample_obj = create_biosample_from_ebi_data(biosample_response[0])
    return biosample_obj

def create_biosample_from_accession(accession):
    resp_obj = dict()
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        resp_obj['message'] = f"{accession} already exists"
        resp_obj['status'] = 400
        return resp_obj
    biosample_response = ena_client.get_sample_from_biosamples(accession)
    if not biosample_response:
        resp_obj['message'] = f"{accession} not found in INSDC"
        resp_obj['status'] = 400
        return resp_obj
    biosample_obj = create_biosample_from_ebi_data(biosample_response)
    if biosample_obj:
        resp_obj['message'] = f'{biosample_obj.accession} correctly saved'
        resp_obj['status'] = 201
        return resp_obj
    resp_obj['message'] = 'Unhandled error'
    resp_obj['status'] = 500
    return resp_obj

def create_biosample_from_ncbi_data(accession, ncbi_response, organism):
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return biosample_obj
    required_metadata = dict(accession=accession,taxid=organism.taxid,scientific_name=organism.scientific_name)
    biosample_metadata = dict()
    ##format to biosample response model
    for attr in ncbi_response['biosample']['attributes']:
        biosample_metadata[attr['name']] = [dict(text=attr['value'])] 
    extra_metadata = parse_sample_metadata(biosample_metadata)
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    return new_biosample

def create_biosample_from_ebi_data(sample):
    existing_biosample = BioSample.objects(accession=sample['accession']).first()
    if existing_biosample:
        return existing_biosample
    required_metadata=dict(accession=sample['accession'],taxid=str(sample['taxId']))
    organism = organisms_service.get_or_create_organism(required_metadata['taxid'])
    if not organism:
        return
    if 'scientificName' in sample.keys():
        required_metadata['scientific_name'] = sample['scientificName']
    elif 'organism' in sample['characteristics'].keys():
        required_metadata['scientific_name'] = sample['characteristics']['organism'][0]['text']
    else:
        organism = organisms_service.get_or_create_organism(sample['taxId'])
        required_metadata['scientific_name'] = organism.scientific_name
    extra_metadata = parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession','organism']})
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    return new_biosample
    

def delete_biosample(accession):
    biosample_to_delete = BioSample.objects(accession=accession).first()
    if not biosample_to_delete:
        raise NotFound
    biosample_to_delete.delete()
    return accession

def parse_sample_metadata(metadata):
    sample_metadata = dict()
    for k in metadata.keys():
        sample_metadata[k] = metadata[k][0]['text']
    return sample_metadata