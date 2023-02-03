from db.models import BioSample, Organism
from errors import NotFound
from utils import data_helper
from utils import ena_client,utils
from organism.organisms_service import get_or_create_organism
from datetime import datetime
from mongoengine.queryset.visitor import Q

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
        biosamples = BioSample.objects(filter_query, date_query)
    elif filter_query:
        biosamples = BioSample.objects(filter_query)
    elif date_query:
        biosamples = BioSample.objects(date_query)
    else:
        biosamples = BioSample.objects()
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
        return (Q(metadata_habitat__iexact=filter) | Q(metadata__habitat__icontains=filter))
    elif option == 'gal':
        return (Q(metadata_GAL__iexact=filter) | Q(metadata__GAL__icontains=filter)) 
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def create_biosample_from_accession(accession):

    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return biosample_obj
    biosample_response = ena_client.get_sample_from_biosamples(accession)
    if not biosample_response:
        return
    biosample_obj = create_biosample_from_ebi_data(biosample_response[0])
    data_helper.create_data_from_biosample(biosample_obj)
    ##create data here
    return biosample_obj

def create_biosample_from_accession_input(accession):
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
        data_helper.create_data_from_biosample(biosample_obj)
        resp_obj['message'] = f'{biosample_obj.accession} correctly saved'
        resp_obj['status'] = 201
        return resp_obj
    resp_obj['message'] = 'Unhandled error'
    resp_obj['status'] = 500
    return resp_obj
    
def get_biosamples_derived_from(accession):
    saved_biosamples = list()
    response = ena_client.get_samples_derived_from(accession)
    if not response:
        return saved_biosamples
    for sample in response:
        saved_biosample = create_biosample_from_ebi_data(sample)
        if not saved_biosample:
            continue
        saved_biosamples.append(saved_biosample)
    return saved_biosamples

def create_biosample_from_ncbi_data(accession, ncbi_response, organism):
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return biosample_obj
    required_metadata = dict(accession=accession,taxid=organism.taxid,scientific_name=organism.scientific_name)
    biosample_metadata = dict()
    ##format to biosample response model
    for attr in ncbi_response['biosample']['attributes']:
        biosample_metadata[attr['name']] = [dict(text=attr['value'])] 
    extra_metadata = utils.parse_sample_metadata(biosample_metadata)
    new_biosample = BioSample(metadata=extra_metadata,**required_metadata).save()
    return new_biosample

def create_biosample_from_ebi_data(sample):
    existing_biosample = BioSample.objects(accession=sample['accession']).first()
    if existing_biosample:
        return existing_biosample
    required_metadata=dict(accession=sample['accession'],taxid=str(sample['taxId']))
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
    

def delete_biosample(accession):
    biosample_to_delete = BioSample.objects(accession=accession).first()
    if not biosample_to_delete:
        raise NotFound
    samples_to_update = BioSample.objects(sub_samples=accession).update(pull__sub_samples=accession)
    organism_to_update = Organism.objects(taxid=biosample_to_delete.taxid).first()
    if organism_to_update:
        organism_to_update.modify(pull__biosamples=accession)
        organism_to_update.save()
    biosample_to_delete.delete()
    return accession