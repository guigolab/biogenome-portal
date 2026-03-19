from db.models import BioSample, Assembly, BioSampleSubmission, Organism, ReadRun
from db.enums import Roles
from werkzeug.exceptions import BadRequest, Conflict, NotFound,Unauthorized
from mongoengine.queryset.visitor import Q
from helpers import data, organism as organism_helper, biosample as biosample_helper, ena_checklist, user as user_helper
import xml.etree.ElementTree as ET
from clients import ebi_client
import os
from rest.common.service_utils import get_or_404

CHECKLIST_PATH = '/server/templates/checklist.xml'
WEBIN_USER = os.getenv('WEBIN_USER')
WEBIN_PWD = os.getenv('WEBIN_PASSWORD')

def get_biosample(accession):
    return get_or_404(BioSample, f"BioSample {accession} not found!", accession=accession)

def create_biosample_from_accession(accession):
    if BioSample.objects(accession=accession).first():
        raise Conflict(description=f"BioSample {accession} already exists")
    
    biosample_obj = biosample_helper.handle_biosample(accession)

    if not biosample_obj:
        raise BadRequest(description=f"BioSample {accession} not found in INSDC")
    
    organism_obj = organism_helper.handle_organism(biosample_obj.taxid)
    if not organism_obj:
        raise BadRequest(description=f"Organism {biosample_obj.taxid} not found in INSDC")

    # BioSample save (handle_biosample) already ran post_save sync for status/counts

    return accession

def delete_biosample(accession):
    biosample_to_delete = get_biosample(accession)
    # Derived samples are not removed by BioSample post_delete; delete them first.
    BioSample.objects(__raw__={"metadata.sample derived from": accession}).delete()

    biosample_to_delete.delete()
    # post_delete removes assemblies/read runs/coords for this accession + syncs organism/taxonomy

    return accession

def get_related_reads(accession, args):
    get_biosample(accession)
    related_query = Q(sample_accession=accession) | Q(metadata__sample_accession=accession)
    reads = ReadRun.objects(related_query).exclude("id", "created")
    fields = ['run_accession', 'experiment_accession', 'sample_accession', 'taxid', 'scientific_name']
    return data.get_related_items(
        reads,
        args,
        fields=fields,
        allowed_fields=fields + ['metadata', 'taxon_lineage'],
        default_sort_column='run_accession',
    )

def get_related_assemblies(accession, args):
    get_biosample(accession)
    assemblies = Assembly.objects(sample_accession=accession).exclude('id', 'created')
    fields = ['accession', 'assembly_name', 'sample_accession', 'taxid', 'scientific_name']
    return data.get_related_items(
        assemblies,
        args,
        fields=fields,
        allowed_fields=fields + ['metadata', 'taxon_lineage'],
        default_sort_column='accession',
    )

def get_related_sub_samples(accession, args):
    get_biosample(accession)
    sub_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).exclude('id','created')
    fields = ['accession', 'scientific_name', 'taxid']
    return data.get_related_items(
        sub_samples,
        args,
        fields=fields,
        allowed_fields=fields + ['metadata', 'taxon_lineage'],
        default_sort_column='accession',
    )


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
    return get_or_404(
        BioSampleSubmission,
        f"biosample with accession {accession} not found",
        accession=accession,
    )

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
        #get user
    organism = organism_helper.handle_organism(taxid)
    if not organism:
        raise BadRequest(description=f"Organism {taxid} not found in INSDC")
        
    validation_response = ebi_client.validate_biosample(payload, ena_token)
    if validation_response.status_code != 200:
        return validation_response.json(), validation_response.status_code
    ##
    submission_response = ebi_client.submit_biosample_to_ebi(payload, ena_token)

    if submission_response.status_code != 201:
        return submission_response.json(), submission_response.status_code

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
    # BioSampleSubmission post_save refreshes organism GoaT-related aggregates
    return f"{submitted_sample.name} correctly published in biosamples with accession {submitted_sample.accession}", 201
    ## do we need to store the accession??
    ## handle species, update goat status