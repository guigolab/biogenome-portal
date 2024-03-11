from lxml import etree
import requests
from . import ncbi_client
from mongoengine.errors import ValidationError


def save_document(document):
    try:
        document.save()
        return document, 200
    except ValidationError as e:
        return e.to_dict(), 400


def get_annotations(org_name):
    response = requests.get(f'https://genome.crg.cat/geneid-predictions/api/organisms/{org_name}')
    if response.status_code != 200:
        return
    return response.json()    

def parse_taxon_from_ena(xml):
    root = etree.fromstring(xml)
    organism = root[0].attrib
    lineage = []
    for taxon in root[0]:
        if taxon.tag == 'lineage':
            for node in taxon:
                lineage.append(node.attrib)
    lineage.insert(0,organism)
    return lineage

## expect biosample model from ebi biosamples
def parse_sample_metadata(metadata):
    sample_metadata = dict()
    for k in metadata.keys():
        sample_metadata[k] = metadata[k][0]['text']
    return sample_metadata


def validate_taxonomy(user, existing_organisms, taxids):

    existing_taxids = [org.taxid for org in existing_organisms]
    #CHECK USER PERMISSION
    if not user:
        return [{'user':'User not found'}], None
    
    taxonomy_errors = check_species_permission(user, existing_taxids)

    if taxonomy_errors:
        return taxonomy_errors, None
    
    new_taxids = [taxid for taxid in taxids if taxid not in existing_taxids]

    new_taxons_to_parse = []

    if new_taxids:
    
        new_taxons_to_parse.extend( ncbi_client.get_taxons(new_taxids))

        if not new_taxons_to_parse:
            taxonomy_errors.append({'taxonomy': f"No taxid has been found for {','.join(new_taxids)}"})
            return taxonomy_errors, None
        
        insdc_new_taxids = [str(t_to_parse.get('taxonomy').get('tax_id')) for t_to_parse in new_taxons_to_parse]

        for n_taxid in new_taxids:
            if not new_taxons_to_parse:
                taxonomy_errors.append({n_taxid: f"{n_taxid} not found in INSDC"})
            if not n_taxid in insdc_new_taxids:
                taxonomy_errors.append({n_taxid: f"{n_taxid} not found in INSDC"})
        
    return taxonomy_errors, new_taxons_to_parse


def check_species_permission(user, existing_taxids):
    taxonomy_errors = []
    if user.role.value == 'Admin':
        return taxonomy_errors
    for ex_taxid in existing_taxids:
        if ex_taxid not in user.species:
            taxonomy_errors.append({'taxonomy':f"The organism {ex_taxid} already exists in the db and you don't have the rights to modify it!"})
    return taxonomy_errors

# def create_assembly_related_data(ncbi_response):
#     ##get or create organism
#     ##get or create biosample

# def create_biosample_related_data():
#     ##get or create organism