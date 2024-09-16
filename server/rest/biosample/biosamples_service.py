from db.models import BioSample,Assembly,Experiment,Read
from errors import NotFound
from mongoengine.queryset.visitor import Q
import os
from helpers import data, organism as organism_helper, biosample as biosample_helper

PROJECTS = [p.strip() for p in os.getenv('PROJECTS').split(',') if p] if os.getenv('PROJECTS') else None
FIELDS_TO_EXCLUDE = ['id','created','last_check']

def get_biosamples(args):
    filter = get_filter(args.get('filter'))
    return data.get_items(args, 
                                 BioSample, 
                                 filter,
                                 ['accession', 'scientific_name', 'taxid'])

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
    
    biosample_obj = biosample_helper.handle_biosample(accession)

    if not biosample_obj:
        return f"BioSample {accession} not found in INSDC", 400
    
    organism_obj = organism_helper.handle_organism(biosample_obj.taxid)
    if not organism_obj:
        return f"Organism {biosample_obj.taxid} not found in INSDC", 400

    organism_obj.save()
    
    return f"Biosample {accession} correctly saved", 201

def biosample_exists(accession):
    return BioSample.objects(accession=accession).exclude(*FIELDS_TO_EXCLUDE).first()

def delete_biosample(accession):
    biosample_to_delete = BioSample.objects(accession=accession).first()

    if not biosample_to_delete:
        raise NotFound
    #delete siblings
    BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).delete()
    Assembly.objects(sample_accession=accession).delete()
    experiments = Experiment.objects(sample_accession=accession).scalar('experiment_accession')
    Read.objects(experiment_accession__in=experiments).delete()
    Experiment.objects(sample_accession=accession).delete()
    organism_obj = organism_helper.handle_organism(biosample_to_delete.accession)
    biosample_to_delete.delete()
    organism_obj.save()
    return accession

def get_related_experiments(accession):
    related_exp_query = Q(sample_accession=accession) | Q(metadata__sample_accession=accession)
    experiments = Experiment.objects(related_exp_query).exclude('id', 'created')
    return experiments

def get_related_assemblies(accession):
    assemblies = Assembly.objects(sample_accession=accession).exclude('id', 'created')
    return assemblies

def get_related_sub_samples(accession):
    sub_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).exclude('id','created')
    return sub_samples