from db.models import BioSample,Assembly,Experiment,Read,BioSampleSubmission,Organism
from db.enums import Roles
from werkzeug.exceptions import BadRequest, Conflict, NotFound,Unauthorized
from mongoengine.queryset.visitor import Q
from helpers import data, organism as organism_helper, biosample as biosample_helper, ena_checklist, user as user_helper
import xml.etree.ElementTree as ET
from clients import ebi_client
import os

CHECKLIST_PATH = '/server/templates/checklist.xml'
WEBIN_USER = os.getenv('WEBIN_USER')
WEBIN_PWD = os.getenv('WEBIN_PASSWORD')

def get_biosample(accession):
    biosample_obj = BioSample.objects(accession=accession).first()
    if not biosample_obj:
        raise NotFound(description=f"BioSample {accession} not found!")
    return biosample_obj

def create_biosample_from_accession(accession):
    if BioSample.objects(accession=accession).first():
        raise Conflict(description=f"BioSample {accession} already exists")
    
    biosample_obj = biosample_helper.handle_biosample(accession)

    if not biosample_obj:
        raise BadRequest(description=f"BioSample {accession} not found in INSDC")
    
    organism_obj = organism_helper.handle_organism(biosample_obj.taxid)
    if not organism_obj:
        raise BadRequest(description=f"Organism {biosample_obj.taxid} not found in INSDC")

    organism_obj.save()
    
    return accession

def delete_biosample(accession):
    biosample_to_delete = get_biosample(accession)
    #delete siblings
    BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).delete()

    Assembly.objects(sample_accession=accession).delete()

    experiments = Experiment.objects(sample_accession=accession).scalar('experiment_accession')
    Read.objects(experiment_accession__in=experiments).delete()
    Experiment.objects(sample_accession=accession).delete()
    
    organism_obj = organism_helper.handle_organism(biosample_to_delete.taxid)
    biosample_to_delete.delete()
    organism_obj.save()
    return accession

def get_related_experiments(accession):
    related_exp_query = Q(sample_accession=accession) | Q(metadata__sample_accession=accession)
    experiments = Experiment.objects(related_exp_query).exclude('id', 'created').to_json()
    return experiments

def get_related_assemblies(accession):
    assemblies = Assembly.objects(sample_accession=accession).exclude('id', 'created')
    return assemblies.to_json()

def get_related_sub_samples(accession):
    sub_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).exclude('id','created')
    return sub_samples.to_json()


def get_biosample_checklist():
    if os.path.exists(CHECKLIST_PATH):
        tree = ET.parse(CHECKLIST_PATH)
        root = tree.getroot()
        json_response = ena_checklist.xml_to_dict(root)
        return json_response
    else:
        raise NotFound(description="No template found")


def get_submitted_biosamples(args):
    return data.get_items('submitted_biosamples', args)

def get_submitted_sample(accession):
    sample = BioSampleSubmission.objects(accession=accession).first()
    if not sample:
        raise NotFound(description=f"biosample with accession {accession} not found")
    return sample

def submit_sample(payload):
    user = user_helper.get_current_user()
    if not user:
        raise Unauthorized(description=f"You first must log in")
    
    taxid = payload.get('taxid')
    if not taxid:
        raise BadRequest(desciption=f"The field taxid is mandatory")
    
    ena_token = ebi_client.get_webin_token(WEBIN_USER, WEBIN_PWD)

    status_code = ebi_client.check_token_is_valid(ena_token)
    if status_code != 200:
        raise BadRequest(description='Token not found')

    taxid = str(taxid)
    ##check user has rights over species
    existing_organism = Organism.objects(taxid=taxid).first()

    if existing_organism and user.role.value != Roles.DATA_ADMIN.value and taxid not in user.species:
        raise Unauthorized(description=f"You can't add data related to {existing_organism.scientific_name}")
    
    validation_response = ebi_client.validate_biosample(payload, ena_token)
    if validation_response.status_code != 200:
        return validation_response.json(), validation_response.status_code
    ##
    submission_response = ebi_client.submit_biosample_to_ebi(payload, ena_token)

    if submission_response.status_code != 201:
        return submission_response.json(), submission_response.status_code
    #get user
    organism = organism_helper.handle_organism(taxid)
    if not organism:
        raise BadRequest(description=f"Organism {taxid} not found in INSDC")
        
    user_name = user.name
    ## get organisms
    user_helper.add_species_to_datamanager([taxid], user)

    filtered_response = {k:v for k,v in submission_response.json().items() if k not in ['taxId']}
    submitted_sample = BioSampleSubmission(
        user=user_name,
        taxid=taxid,
        scientific_name=organism.scientific_name,
        **filtered_response
    )
    submitted_sample.save()

    return f"{submitted_sample.name} correctly published in biosamples with accession {submitted_sample.accession}", 201
    ## do we need to store the accession??
    ## handle species, update goat status