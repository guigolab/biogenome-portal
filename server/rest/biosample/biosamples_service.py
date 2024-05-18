from db.models import BioSample,Assembly,Experiment
from errors import NotFound
from mongoengine.queryset.visitor import Q
import os
from clients import ebi_client
from parsers import biosample as biosample_parser
from helpers import data, organism as organism_helper, geolocation, biosample as biosample_helper

PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p] if os.getenv('PROJECTS') else None
FIELDS_TO_EXCLUDE = ['id','created','last_check']

def get_biosamples(args):
    filter = get_filter(args.get('filter'))
    selected_fields = [v for k, v in args.items(multi=True) if k.startswith('fields[]')]
    if not selected_fields:
        selected_fields = ['accession', 'scientific_name', 'taxid']
    return data.get_items(args, 
                                 BioSample, 
                                 FIELDS_TO_EXCLUDE, 
                                 filter,
                                 selected_fields)

def get_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) |  (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
    else:
        return None

def get_biosample(accession):
    biosample_obj = biosample_exists(accession)
    if not biosample_obj:
        raise NotFound
    return biosample_obj

def create_biosample_from_accession(accession):
    if biosample_exists(accession):
        return f"{accession} already exists", 400
    
    
    organism_obj = organism_helper.handle_organism(biosample_obj.taxid)
    if not organism_obj:
        return f"Organism {biosample_obj.taxid} not found in INSDC", 400

    biosample_obj = biosample_helper.handle_biosample(accession)

    if not biosample_obj:
        return f"BioSample {accession} not found in INSDC", 400
    
    organism_obj.save()
    
    return f"Biosample {accession} correctly saved", 201

def biosample_exists(accession):
    return BioSample.objects(accession=accession).exclude(*FIELDS_TO_EXCLUDE).first()


def fetch_biosample_data(accession):
    return ebi_client.get_sample_from_biosamples(accession)


def parse_and_save_biosample(biosample_response):
    biosample_obj = biosample_parser.parse_biosample_from_ebi_data(biosample_response)
    biosample_obj.save()
    return biosample_obj

def handle_biosample_location_data(biosample_obj):
    geolocation.save_coordinates(biosample_obj)
    geolocation.update_countries_from_biosample(biosample_obj, biosample_obj.accession)


def handle_derived_samples(accession):
    ebi_biosample_response = ebi_client.get_samples_derived_from(accession)
    biosample_siblings = [biosample_parser.parse_biosample_from_ebi_data(sample) for sample in ebi_biosample_response]
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