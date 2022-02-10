from lxml import etree
# from .constants import CHECKLIST_PARSER
from flask import make_response,jsonify

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

# def parse_sample_metadata(sample_object, metadata):
#     for key in metadata.keys():
#         if key in CHECKLIST_PARSER.keys():
#             sample_object[CHECKLIST_PARSER[key]] = {}
#             sample_object[CHECKLIST_PARSER[key]]['text'] = metadata[key]['text']
#             if 'unit' in metadata[key].keys():
#                 sample_object[CHECKLIST_PARSER[key]]['unit'] = metadata[key]['unit']
#     return sample_object


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