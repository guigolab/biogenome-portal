from db.models import BioSample,Assembly,Experiment,Organism,SampleCoordinates
from errors import NotFound
from ..utils import ena_client
from ..organism import organisms_service
from ..sample_location import sample_locations_service
from datetime import datetime
from mongoengine.queryset.visitor import Q
import os

PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p] if os.getenv('PROJECTS') else None

MODEL_LIST = {
    'assemblies':{'model':Assembly, 'id':'accession'},
    'sub_samples':{'model':BioSample, 'id':'accession'},
    'experiments':{'model':Experiment, 'id':'experiment_accession'},
    }

def get_biosamples(offset=0,limit=20,
                    filter=None, filter_option="scientific_name",
                    start_date=None, end_date=datetime.utcnow,
                    sort_column=None, sort_order=None):
    
    biosamples = BioSample.objects().exclude('id', 'created')

    if filter:
        filter_query = get_filter(filter,filter_option)
        biosamples = biosamples.filter(filter_query)

    if start_date and end_date:
        biosamples = biosamples.filter((Q(metadata__collection_date__gte=start_date) & Q(metadata__collection_date__lte=end_date)))
    
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

def get_or_create_biosample(accession):
    biosample = BioSample.objects(accession=accession).first()
    if not biosample:
        biosample_response = ena_client.get_sample_from_biosamples(accession)
        if not biosample_response:
            print(f'Biosample with accession {accession} not found')
            return
        biosample = parse_biosample_from_ebi_data(biosample_response)
    biosample.save()
    sample_locations_service.save_coordinates(biosample)
    sample_locations_service.update_countries_from_biosample(biosample)
    return biosample

def create_biosample_from_accession(accession):
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return f"{accession} already exists" , 400
    
    biosample_response = ena_client.get_sample_from_biosamples(accession)

    if not biosample_response:
        return f"BioSample {accession} not found in INSDC", 400
    
    biosample_obj = parse_biosample_from_ebi_data(biosample_response)

    organism = organisms_service.get_or_create_organism(biosample_obj.taxid)
    if not organism:
        return f"Organism {biosample_obj.taxid} not found in INSDC"
    
    biosample_obj.save()
    sample_locations_service.save_coordinates(biosample_obj)
    sample_locations_service.update_countries_from_biosample(biosample_obj)

    #check if it has children
    ebi_biosample_response = ena_client.get_samples_derived_from(biosample_obj.accession)

    biosample_siblings = [parse_biosample_from_ebi_data(sample_to_save) for sample_to_save in ebi_biosample_response]
    
    existing_siblings = BioSample.objects(accession__in=[b.accession for b in biosample_siblings]).scalar('accession')

    for sibling in biosample_siblings:
        if not sibling.accession in existing_siblings:
            sibling.save()
    biosample_obj.save()

    organism.save()
    return f"Biosample {accession} correctly saved", 201

def parse_biosample_from_ebi_data(sample):
    print(sample.get('characteristics'))
    taxid = str(sample.get('taxId'))
    accession = sample.get('accession')
    scientific_name = sample.get('characteristics').get('scientific_name')[0].get('text')
    required_metadata=dict(accession=accession,taxid=taxid,scientific_name=scientific_name)
    extra_metadata = parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession','organism']})
    return BioSample(metadata=extra_metadata,**required_metadata)

def parse_biosample_from_ncbi_data(ncbi_response):
    taxid = ncbi_response.get('org').get('tax_id')
    scientific_name = ncbi_response.get('org').get('sci_name')
    accession = ncbi_response.get('biosample').get('accession')
    required_metadata=dict(accession=accession,taxid=taxid,scientific_name=scientific_name)
    biosample_metadata = dict()
    ##format to biosample response model
    for attr in ncbi_response['biosample']['attributes']:
        biosample_metadata[attr['name']] = [dict(text=attr['value'])] 
    extra_metadata = parse_sample_metadata(biosample_metadata)
    return BioSample(metadata=extra_metadata,**required_metadata)

def delete_biosample(accession):
    biosample_to_delete = BioSample.objects(accession=accession).first()

    if not biosample_to_delete:
        raise NotFound
    #delete siblings
    BioSample.objects(accession__in=biosample_to_delete.sub_samples).delete()
    biosample_to_delete.delete()
    return accession

def parse_sample_metadata(metadata):
    sample_metadata = dict()
    for k in metadata.keys():
        sample_metadata[k] = metadata[k][0]['text']
    return sample_metadata

def get_sample_related_data(accession, model):
    biosample = BioSample.objects(accession=accession).first()
    if not biosample or not model in MODEL_LIST.keys():
        raise NotFound
    mapped_model = MODEL_LIST.get(model)
    if model == 'sub_samples':
        return BioSample.objects(accession__in=biosample.sub_samples)
    return mapped_model.get('model').objects(sample_accession=accession)

