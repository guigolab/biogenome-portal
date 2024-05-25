from db.models import BioSample,Assembly,Experiment
from errors import NotFound
from clients import ebi_client
from parsers import biosample
from helpers import geolocation
import time
ACCESSION_LIST_LIMIT=500


def handle_biosample(accession):
    biosample_obj = BioSample.objects(accession=accession).first()
    if not biosample_obj:
        biosample_obj = create_biosample_from_accession(accession)
    return biosample_obj


def handle_biosample_from_ncbi_dataset(assembly_obj):
    if not BioSample.objects(accession=assembly_obj.sample_accession).first():
        biosample_obj = biosample.parse_biosample_from_ncbi_datasets(
            assembly_obj.metadata.get('assembly_info').get('biosample'), assembly_obj.taxid, assembly_obj.scientific_name
        )
        biosample_obj.save()
        geolocation.save_coordinates(biosample_obj)
        geolocation.update_countries_from_biosample(biosample_obj, biosample_obj.accession)

def create_biosamples_from_ena_browser(new_accession_list):
    chunks = [new_accession_list[i:i+ACCESSION_LIST_LIMIT] for i in range(0, len(new_accession_list), ACCESSION_LIST_LIMIT)] if len(new_accession_list) >= ACCESSION_LIST_LIMIT else [new_accession_list]
    saved_biosamples = []
    for index, chunk in enumerate(chunks):
        try:
            print(f"Retrieving chunk {index+1} of {len(chunks)}")
            response_xml = ebi_client.get_objects_from_ena_browser(chunk)
            time.sleep(1.5)
            if not response_xml:
                continue
            parsed_biosamples = biosample.parse_samples_from_ena_browser(response_xml)
            if parsed_biosamples:
                saved_biosamples.extend(BioSample.objects.insert(parsed_biosamples))

        except Exception as e:
            print(e)
        print(f"Currently saved samples {len(saved_biosamples)}")
    for saved_biosample in saved_biosamples:
        handle_biosample_location_data(saved_biosample)
    return saved_biosamples


def get_unique_sample_accessions(documents):
    """Extract unique sample accessions from the list of documents."""
    return list(set(doc.sample_accession for doc in documents if doc))

def get_existing_sample_accessions(sample_accessions):
    """Retrieve existing sample accessions from the database."""
    return BioSample.objects(accession__in=sample_accessions).scalar('accession')

def filter_new_sample_accessions(sample_accessions, existing_accessions):
    """Filter out sample accessions that already exist in the database."""
    return [acc for acc in sample_accessions if acc not in existing_accessions]


def handle_sample_accessions(documents_to_save):
    sample_accessions = get_unique_sample_accessions(documents_to_save)
    existing_accessions = get_existing_sample_accessions(sample_accessions)
    new_sample_accessions = filter_new_sample_accessions(sample_accessions, existing_accessions)

    new_documents_to_save = list(documents_to_save)  # Copy the original list

    if new_sample_accessions:
        print(f"New biosamples to save: {len(new_sample_accessions)}")
        created_biosamples = create_biosamples_from_ena_browser([acc for acc in new_sample_accessions if acc])

        if created_biosamples:
            created_accession_list = [sample.accession for sample in created_biosamples]
            missing_accessions = [acc for acc in new_sample_accessions if acc not in created_accession_list]

            if missing_accessions:
                print(f"A total of {len(missing_accessions)} biosamples have not been found in INSDC, skipping related data")
                new_documents_to_save = [
                    doc for doc in documents_to_save 
                    if doc.sample_accession not in missing_accessions
                ]
        else:
            print("No samples found in INSDC")
            new_documents_to_save = [
                doc for doc in documents_to_save 
                if doc.sample_accession not in new_sample_accessions
            ]

    return new_documents_to_save




def create_biosample_from_accession(accession):
    biosample_response = fetch_biosample_data(accession)
    if not biosample_response:
        return None

    biosample_obj = parse_and_save_biosample(biosample_response)

    handle_biosample_location_data(biosample_obj)
    handle_derived_samples(biosample_obj.accession)
    
    return biosample_obj

def fetch_biosample_data(accession):
    return ebi_client.get_sample_from_biosamples(accession)

def parse_and_save_biosample(biosample_response):
    biosample_obj = biosample.parse_biosample_from_ebi_data(biosample_response)
    biosample_obj.save()
    return biosample_obj

def handle_biosample_location_data(biosample_obj):
    geolocation.save_coordinates(biosample_obj)
    geolocation.update_countries_from_biosample(biosample_obj, biosample_obj.accession)


def handle_derived_samples(accession):
    ebi_biosample_response = ebi_client.get_samples_derived_from(accession)
    biosample_siblings = [biosample.parse_biosample_from_ebi_data(sample) for sample in ebi_biosample_response]
    existing_siblings = BioSample.objects(accession__in=[b.accession for b in biosample_siblings]).scalar('accession')
    
    for sibling in biosample_siblings:
        if sibling.accession not in existing_siblings:
            handle_biosample_location_data(sibling)
            sibling.save()

def delete_biosample(accession):
    biosample_to_delete = BioSample.objects(accession=accession).first()

    if not biosample_to_delete:
        raise NotFound
    #delete siblings
    biosample_to_delete.delete()
    return accession

def get_related_experiments(accession):
    experiments = Experiment.objects(sample_accession=accession).exclude('id', 'created')
    return experiments

def get_related_assemblies(accession):
    assemblies = Assembly.objects(sample_accession=accession).exclude('id', 'created')
    return assemblies

def get_related_sub_samples(accession):
    sub_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).exclude('id','created')
    return sub_samples