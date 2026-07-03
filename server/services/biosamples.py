import logging

from db.model import Assembly, BioSample, BioSampleSubmission, Organism, ReadRun
from db.enums import Roles
from werkzeug.exceptions import BadRequest, Conflict, NotFound,Unauthorized
from mongoengine.queryset.visitor import Q
from helpers import (
    data,
    organism as organism_helper,
    biosample as biosample_helper,
    user as user_helper,
)
from helpers.rest_catalog_sync import cascade_delete_biosample, sync_species_after_catalog_change
import xml.etree.ElementTree as ET
from clients import ebi_client
import os
from helpers.related_list import related_catalog_items
from helpers.service_utils import get_or_404

logger = logging.getLogger(__name__)

CHECKLIST_PATH = '/server/templates/checklist.xml'
WEBIN_USER = os.getenv('WEBIN_USER')
WEBIN_PWD = os.getenv('WEBIN_PASSWORD')

READ_RUN_LIST_FIELDS = [
    "run_accession",
    "experiment_accession",
    "sample_accession",
    "taxid",
    "scientific_name",
]
READ_RUN_LIST_DEFAULT_SORT = "run_accession"


def _xml_to_dict(element):
    result = {}
    
    # Get element attributes
    if element.attrib:
        result["attributes"] = element.attrib
    
    # Process child elements
    for child in element:
        child_data = _xml_to_dict(child)
        tag = child.tag.lower()
        # Handle multiple occurrences of the same tag
        if tag in result:
            if isinstance(result[tag], list):
                result[tag].append(child_data)
            else:
                result[tag] = [result[tag], child_data]
        else:
            result[tag] = child_data
    
    # Store text content if available
    text = element.text.strip() if element.text and element.text.strip() else None
    if text:
        result["text"] = text
    
    return result

def create_biosample_from_accession(accession):
    if BioSample.objects(accession=accession).first():
        raise Conflict(description=f"BioSample {accession} already exists")
    
    biosample_obj = biosample_helper.handle_biosample(
        accession, save_related_organism=True
    )

    if not biosample_obj:
        raise BadRequest(description=f"BioSample {accession} not found in INSDC")

    organism_obj = organism_helper.handle_organism(biosample_obj.taxid)
    if not organism_obj:
        raise BadRequest(description=f"Organism {biosample_obj.taxid} not found in INSDC")

    # ``handle_biosample(..., save_related_organism=True)`` persists the sample, links lineage,
    # and runs ``sync_species_after_catalog_change``; ``handle_organism`` here ensures the row exists.

    return accession

def delete_biosample(accession):
    biosample_to_delete = get_or_404(BioSample, f"BioSample {accession} not found!", accession=accession)

    cascade_delete_biosample(biosample_to_delete)

    return accession

def get_related_reads(accession, args):
    get_or_404(BioSample, f"BioSample {accession} not found!", accession=accession)
    related_query = Q(sample_accession=accession) | Q(metadata__sample_accession=accession)
    reads = ReadRun.objects(related_query).exclude("id", "created")
    return related_catalog_items(
        reads,
        args,
        fields=READ_RUN_LIST_FIELDS,
        default_sort_column=READ_RUN_LIST_DEFAULT_SORT,
    )

def get_related_assemblies(accession, args):
    get_or_404(BioSample, f"BioSample {accession} not found!", accession=accession)
    assemblies = Assembly.objects(sample_accession=accession).exclude('id', 'created')
    fields = ['accession', 'assembly_name', 'sample_accession', 'taxid', 'scientific_name']
    return related_catalog_items(
        assemblies,
        args,
        fields=fields,
        default_sort_column='accession',
    )

def get_related_sub_samples(accession, args):
    get_or_404(BioSample, f"BioSample {accession} not found!", accession=accession)
    sub_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).exclude('id','created')
    fields = ['accession', 'scientific_name', 'taxid']
    return related_catalog_items(
        sub_samples,
        args,
        fields=fields,
        default_sort_column='accession',
    )


def get_biosample_checklist():
    if os.path.exists(CHECKLIST_PATH):
        tree = ET.parse(CHECKLIST_PATH)
        root = tree.getroot()
        json_response = _xml_to_dict(root)
        return json_response
    else:
        raise NotFound(description="No template found")


def get_submitted_biosamples(args):
    if hasattr(args, 'to_dict'):
        params = args.to_dict(flat=True)
    else:
        params = dict(args)
    user = user_helper.get_current_user()
    if user and user.role.value != Roles.DATA_ADMIN.value:
        params['user'] = user.name
    return data.get_items('submitted_biosamples', params)


def submit_sample(payload):
    user = user_helper.get_current_user()
    if not user:
        raise Unauthorized(description=f"You first must log in")
    
    taxid = payload.get('taxid')
    if not taxid:
        raise BadRequest(description="The field taxid is mandatory")
    taxid = str(taxid)

    is_admin = user.role.value == Roles.DATA_ADMIN.value
    if not is_admin and taxid not in user.species:
        existing_organism = Organism.objects(taxid=taxid).first()
        label = existing_organism.scientific_name if existing_organism else taxid
        raise Unauthorized(description=f"You can't add data related to {label}")

    ena_token = ebi_client.get_webin_token(WEBIN_USER, WEBIN_PWD)

    status_code = ebi_client.check_token_is_valid(ena_token)
    if status_code != 200:
        raise BadRequest(description='Token not found')

    organism = organism_helper.handle_organism(taxid)
    if not organism:
        raise BadRequest(description=f"Organism {taxid} not found in INSDC")

    # TODO: EBI BioSamples JSON schema expects top-level "taxId" (see parsers/biosample.py),
    # but the portal payload uses "taxid". Verify and rename before changing production submissions.
    validation_response = ebi_client.validate_biosample(payload, ena_token)
    if validation_response.status_code != 200:
        return validation_response.json(), validation_response.status_code
    ##
    if os.getenv('DEV'):
        submission_response = ebi_client.submit_biosample_to_test_env(payload, ena_token)
    else:
        submission_response = ebi_client.submit_biosample_to_ebi(payload, ena_token)
    #submission_response = ebi_client.submit_biosample_to_ebi(payload, ena_token)

    if submission_response.status_code != 201:
        return submission_response.json(), submission_response.status_code

    user_name = user.name
    ## get organisms
    user_helper.add_species_to_datamanager([taxid], user)

    submission_json = submission_response.json()
    filtered_response = {k: v for k, v in submission_json.items() if k not in ["taxId"]}
    submitted_sample = BioSampleSubmission(
        user=user_name,
        taxid=taxid,
        scientific_name=organism.scientific_name,
        **filtered_response
    )
    submitted_sample.save()
    sync_species_after_catalog_change(taxid, None)

    # Best-effort: pull the new sample from EBI into the catalog immediately.
    # If the API index lags or the sample is not yet public, handle_biosample returns None
    # and the periodic biosamples job can import it later — never block the HTTP response.
    accession = getattr(submitted_sample, "accession", None) or submission_json.get(
        "accession"
    )
    if accession:
        try:
            imported = biosample_helper.handle_biosample(
                str(accession), save_related_organism=True
            )
            if not imported:
                logger.info(
                    "Post-submit BioSample not available from EBI yet (accession=%s); "
                    "batch import may pick it up later.",
                    accession,
                )
        except Exception:
            logger.warning(
                "Post-submit BioSample import failed (non-blocking), accession=%s",
                accession,
                exc_info=True,
            )

    return f"{submitted_sample.name} correctly published in biosamples with accession {submitted_sample.accession}", 201
