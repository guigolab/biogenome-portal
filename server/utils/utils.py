from curses import meta
from lxml import etree
from flask import make_response,jsonify
from .constants import CHECKLIST_FIELD_GROUPS
import requests

def get_annotations(org_name):
    response = requests.get(f'https://genome.crg.cat/geneid-predictions/api/organisms/{org_name}')
    if response.status_code != 200:
        return
    return response.json()    

def parse_taxon(xml):
    root = etree.fromstring(xml)
    organism = root[0].attrib
    lineage = []
    for taxon in root[0]:
        if taxon.tag == 'lineage':
            for node in taxon:
                lineage.append(node.attrib)
    lineage.insert(0,organism)
    return lineage

def get_checklist_fields(groups):
    fields = list()
    #upper case model to match excel fields
    for group in groups:
        fields.extend(group['fields'])
    return fields

## expect biosample model from ebi biosamples
def parse_sample_metadata(metadata):
    sample_metadata = dict()
    for k in metadata.keys():
        sample_metadata[k] = metadata[k][0]['text']
    return sample_metadata

def custom_response(message,code):
    response = make_response(jsonify(message=message), code)
    return response


