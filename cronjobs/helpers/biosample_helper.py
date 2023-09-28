from db.models import BioSample,Organism
from . import utils 
import requests
import time

#accession: biosample data dictionary
def get_new_biosamples_from_ncbi_assembly_model(ncbi_assemblies):
    biosample_collection_map = dict()
    for ncbi_assembly in ncbi_assemblies:
        biosample_accession = ncbi_assembly['assembly_info']['biosample']['accession']
        if not biosample_accession in biosample_collection_map.keys():
            biosample_collection_map[biosample_accession] = dict(**ncbi_assembly['assembly_info']['biosample'])
    existing_biosamples = utils.get_objects_by_scalar_id(BioSample,'accession',query=dict(accession__in=biosample_collection_map.keys()))
    new_biosamples_collection_map = dict()
    for key in biosample_collection_map.keys():
        if not key in existing_biosamples:
            new_biosamples_collection_map[key] = biosample_collection_map[key]
    return new_biosamples_collection_map

def get_biosamples_from_ncbi_assembly_model(ncbi_assemblies):
    biosample_collection_map = {}

    # Extract biosample data from ncbi_assemblies
    for ncbi_assembly in ncbi_assemblies:
        biosample_info = ncbi_assembly.get('assembly_info', {}).get('biosample')
        if biosample_info:
            biosample_accession = biosample_info.get('accession')
            if biosample_accession and biosample_accession not in biosample_collection_map:
                biosample_collection_map[biosample_accession] = biosample_info

    # Get existing biosample accessions from the database
    existing_biosample_accessions = BioSample.objects(accession__in=biosample_collection_map.keys())
    

    # Filter out existing biosamples to get new ones
    new_biosamples_collection_map = {
        key: biosample_info for key, biosample_info in biosample_collection_map.items()
        if key not in existing_biosample_accessions
    }

    return new_biosamples_collection_map

def parse_biosample_from_ncbi_datasets_assemblies(biosample):
    accession = biosample['accession']
    print(f'parsing {accession} data')
    organism_info = biosample['description']['organism']
    attributes = {attr['name']: attr['value'] for attr in biosample['attributes']}
    
    biosample_to_save_dict = {
        'accession': biosample['accession'],
        'taxid': str(organism_info['tax_id']),
        'scientific_name': organism_info['organism_name'],
        'metadata': attributes,
    }

    biosample = BioSample(**biosample_to_save_dict)
    print(f'{biosample.accession} parsed and ready to be saved')
    return biosample

def add_data_to_biosamples(new_data, sample_accessions, field_to_modify, id_field):
    # Create a dictionary to group new data by sample_accession
    print(f'Appending {len(new_data)} of {field_to_modify} to {len(sample_accessions)} samples')
    data_by_sample = {}
    for data_item in new_data:
        sample_accession = data_item.sample_accession if data_item.sample_accession else data_item.metadata['sample_accession']
        if sample_accession not in data_by_sample:
            data_by_sample[sample_accession] = []
        data_by_sample[sample_accession].append(data_item[id_field])
    # Query biosamples to update
    biosamples_to_update = BioSample.objects(accession__in=sample_accessions)
    print(f'Biosamples to update {len(data_by_sample.keys())}')
    for biosample_to_update in biosamples_to_update:
        sample_accession = biosample_to_update.accession
        if sample_accession in data_by_sample:
            print('Passing here')
            # Determine which field to modify based on data_type
            biosample_to_update.modify(**{field_to_modify: data_by_sample[sample_accession]})


# def add_experiments_to_biosample(new_experiments, sample_accessions):
#     biosamples_to_update=BioSample.objects(accession__in=sample_accessions)
#     for biosample_to_update in biosamples_to_update:
#         for assembly in new_experiments:
#             if assembly.sample_accession == biosample_to_update.accession:
#                 biosample_to_update.modify(add_to_set__assemblies=assembly.accession)


# def add_assembly_to_biosample(new_assemblies, sample_accessions): 
#     biosamples_to_update=BioSample.objects(accession__in=sample_accessions)
#     for biosample_to_update in biosamples_to_update:
#         for assembly in new_assemblies:
#             if assembly.sample_accession == biosample_to_update.accession:
#                 biosample_to_update.modify(add_to_set__assemblies=assembly.accession)

# def add_experiment_to_biosample(new_experiments, )
def retrieve_biosamples_from_ebi_by_project(project_name):
    biosamples = []
    # Start with the first API request
    href = f"https://www.ebi.ac.uk/biosamples/samples?size=200&filter=attr%3Aproject%20name%3A{project_name}"

    while href:
        try:
            # Make the API request
            resp = requests.get(href).json()
            # Extract samples from the response
            samples = resp.get('_embedded', {}).get('samples', [])
            # Check for existing accessions and add non-existing samples
            biosamples.extend(samples)
            # Check for the 'next' link to continue pagination
            if 'next' in resp.get('_links', {}):
                href = resp['_links']['next']['href']
            else:
                href = None
            # Introduce a delay before the next request to avoid overloading the API
            time.sleep(2)
        except Exception as e:
            # Handle exceptions (e.g., connection error, JSON parsing error) here
            print(f"An error occurred while fetching biosample from EBI: {e}")
            break  # Exit the loop on error

    return biosamples


def parse_biosample_from_ebi_data(sample):
    taxid = str(sample['taxId'])
    required_metadata = {
        'accession': sample['accession'],
        'taxid': taxid,
        'scientific_name': get_scientific_name(sample)
    }
    
    extra_metadata = parse_sample_metadata({
        k: sample['characteristics'][k]
        for k in sample['characteristics']
        if k not in ['taxId', 'scientificName', 'accession', 'organism']
    })
    new_biosample = BioSample(metadata=extra_metadata, **required_metadata)
    return new_biosample

def get_scientific_name(sample):
    if 'scientificName' in sample:
        return sample['scientificName']
    elif 'organism' in sample['characteristics']:
        return sample['characteristics']['organism'][0]['text']
    else:
        organism = Organism.objects(taxid=str(sample['taxId'])).first()
        return organism.scientific_name

def parse_sample_metadata(metadata):
    sample_metadata = {}
    for k, v in metadata.items():
        sample_metadata[k] = v[0]['text']
    return sample_metadata

def map_samples_by_relationship(biosamples_to_save):
    samples_derived_from = {}
    for biosample_to_save in biosamples_to_save:
        if biosample_to_save.metadata and 'sample derived from' in biosample_to_save.metadata.keys():
            parent_accession = biosample_to_save.metadata['sample derived from']
            if not parent_accession in samples_derived_from.keys():
                samples_derived_from[parent_accession]=[]
            samples_derived_from[parent_accession].append(biosample_to_save)
    return samples_derived_from