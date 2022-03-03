from lxml import etree
# from .constants import CHECKLIST_PARSER
from flask import make_response,jsonify
from .constants import RANKS, CHECKLIST_FIELD_GROUPS
import os

RANKS = os.getenv('RANKS').split(',')

def parse_taxon(xml):
    root = etree.fromstring(xml)
    species = root[0].attrib
    lineage = []
    for taxon in root[0]:
        if taxon.tag == 'lineage':
            for node in taxon:
                lineage.append(node.attrib)
    lineage.insert(0,species)
    return lineage

def get_checklist_fields(groups):
    fields = list()
    #upper case model to match excel fields
    for group in groups:
        fields.extend(group['fields'])
    return fields

def parse_sample_metadata(metadata):
    sample=dict()
    fields = get_checklist_fields(CHECKLIST_FIELD_GROUPS)
    custom_fields=dict()
    for key in metadata.keys():
        if key == 'collection date':
            sample['collection_date'] = metadata[key][0]['text']
        elif key in [field['label'] for field in fields]:
            model_attr = next(field['model'] for field in fields if field['label'] == key)
            sample[model_attr] = metadata[key][0]['text']
        elif key in [field['model'] for field in fields]:
            model_attr = next(field['model'] for field in fields if field['model'] == key)
            sample[model_attr] = metadata[key][0]['text']
        else:
            custom_fields[key] = metadata[key][0]['text']
    if len(custom_fields.keys()) > 0:
        sample['custom_fields'] = custom_fields
    return sample
    
#aggregation pipeline returns unordered list of taxon lineage
def sort_lineage(lineage):
    values_obj=dict()
    for idx, rank in enumerate(RANKS):
        values_obj[rank] = idx
    lineage.sort(key=lambda x: values_obj[x['rank']],reverse=True)
    return lineage

##IMPORTANT the reference must be a lazy load reference!!
def update_references(ref_model, current_list, new_list):
    if len(new_list) > 0 and len(current_list) < len(new_list):
        new_items = list(set([el.accession for el in new_list]) - set(el.fetch().accession for el in current_list))
        model_instances = [ref_model(**data) for data in new_items]
        ref_model.objects.insert(model_instances)
        return model_instances

def custom_response(message,code):
    response = make_response(jsonify(message=message), code)
    return response


