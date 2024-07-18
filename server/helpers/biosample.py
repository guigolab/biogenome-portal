from db.models import BioSample
from clients import ebi_client
from parsers import biosample
from helpers import geolocation

def handle_biosample(accession):
    biosample_obj = BioSample.objects(accession=accession).first()
    if not biosample_obj:
        biosample_obj = create_biosample_from_accession(accession)
    return biosample_obj

def create_biosample_from_accession(accession):
    biosample_response = ebi_client.get_sample_from_biosamples(accession)
    if not biosample_response:
        return None

    biosample_obj = biosample.parse_biosample_from_ebi_data(biosample_response)
    
    biosample_obj.save()

    handle_biosample_location_data(biosample_obj)
    handle_derived_samples(biosample_obj.accession)
    
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
