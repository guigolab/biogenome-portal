import datetime
import openpyxl
from flask import current_app as app
import re
from dateutil.parser import parse
from utils.constants import CHECKLIST_FIELD_GROUPS
import xml.etree.ElementTree as ET


##table convert, need to confirm sheet columns
excelParser = {
        'BARCODING_CENTER':'barcoding center',
        'PROJECT_NAME':'project name',
        'TOLID':'tolid',
        'SPECIMEN_ID': 'specimen_id',
        'TAXON_ID':'taxonId',
        'SCIENTIFIC_NAME':'name',
        'COMMON_NAME': 'common_name',
        'CULTURE_OR_STRAIN_ID':'culture_or_strain_id',
        'LIFESTAGE':'lifestage',
        'SEX':'sex',
        'ORGANISM_PART':'organism part',
        'SYMBIONT':'symbiont',
        'SAMPLE_SYMBIONT_OF':'sample symbiont of',
        'RELATIONSHIP':'relationship',
        'SAMPLE_DERIVED_FROM':'sample derived from',
        'COLLECTED_BY':'collected_by',
        'COLLECTING_INSTITUTION':'collecting institution',
        'COLLECTION_DATE':'collection date',
        'COLLECTION_COUNTRY_OR_SEA':'geographic location (country and/or sea)',
        'COLLECTION_REGION_OR_LOCALITY':'geographic location (region and locality)',
        'DECIMAL_LATITUDE':'geographic location (latitude)',
        'DECIMAL_LONGITUDE':'geographic location (longitude)',
        'HABITAT':'habitat',
        'DEPTH':'geographic location (depth)',
        'ELEVATION':'geographic location (elevation)',
        'TIME_OF_COLLECTION':'original collection date',
        'ORIGINAL_GEOGRAPHIC_LOCATION':'original geographic location',
        'IDENTIFIED_BY':'identified_by',
        'IDENTIFIER_AFFILIATION':'identifier_affiliation',
        'SAMPLE_UNIQUE_NAME':'sample_unique_name'
    }

#DToL checklist converter
# def checklist_parser(url):
#     r = requests.get(url)
#     root = etree.fromstring(r.content)
#     field_groups = []
#     for field in root[0][1]:
#         if field.tag == 'FIELD_GROUP':
#             group = dict()
#             group['fields'] = []
#             for f in field:
#                 if f.tag == 'NAME':
#                     group['name'] = f.text
#                 elif f.tag == 'DESCRIPTION':
#                     group['description'] = f.text
#                 else:
#                     field_dict = dict()
#                     for el in f:   
#                         if el.tag == 'LABEL':
#                             field_dict['label'] = el.text
#                         elif el.tag == 'DESCRIPTION':
#                             field_dict['description'] = el.text
#                         elif el.tag == 'UNITS':
#                             field_dict['units'] = el[0].text
#                         elif el.tag == 'MULTIPLICITY':
#                             field_dict['multiplicity'] = el.text
#                         elif el.tag == 'MANDATORY':
#                             field_dict['mandatory'] = el.text
#                         elif el.tag == 'FIELD_TYPE':
#                             if el[0].tag == 'TEXT_CHOICE_FIELD':
#                                 field_dict['options'] = [option[0].text for option in el[0]]
#                             elif el[0].tag == 'TEXT_FIELD':
#                                 if len(el[0]) > 0:
#                                     field_dict['regex'] = el[0][0].text
#                             field_dict['type'] = el[0].tag.lower()
#                     group['fields'].append(field_dict)
#             field_groups.append(group)
#     return field_groups

def parse_sample(header,row):
    values = {}
    for key, cell in zip(header, row):
        if not cell.value:
            continue
        else:
            values[key] = cell.value
    return values

def parse_excel(excel):
    wb_obj = openpyxl.load_workbook(excel,data_only=True)
    sheet_obj = wb_obj.active
    header = [cell.value for cell in sheet_obj[1]]
    samples=[]
    field_groups = CHECKLIST_FIELD_GROUPS
    fields = []
    parsed_samples=[]
    for group in field_groups:
        fields.extend(group['fields'])
    for row in list(sheet_obj.rows)[1:]:
        values = parse_sample(header,row)
        if len(values.keys()) > 2:
            samples.append(values)
    if len(samples) > 0:
        for index, sample in enumerate(samples):
            parsed_sample={'index':index+2}
            checklist_fields={}
            custom_fields={}
            if not 'TAXON_ID' in sample.keys():
                parsed_sample['errors'] = [{'label':'TAXON_ID', 'message': 'Tax Id is mandatory'}]
                parsed_samples.append(parsed_sample)
                return parsed_samples
            elif not 'SCIENTIFIC_NAME' in sample.keys():
                parsed_sample['errors'] = [{'label':'SCIENTIFIC_NAME', 'message': 'name is mandatory'}]
                parsed_samples.append(parsed_sample)
                return parsed_samples
            for key, value in sample.items():
                dict={}
                if key in excelParser.keys():
                    if isinstance(value, type(datetime.datetime(2021,12,30))):
                        dict['text'] = value.date().isoformat()
                    elif key == 'TAXON_ID':
                        parsed_sample['taxonId'] = value
                    elif key == 'SCIENTIFIC_NAME':
                        parsed_sample['scientificName'] = value
                    elif key == 'SAMPLE_UNIQUE_NAME':
                        parsed_sample['sample_unique_name'] = value
                    else:
                        dict['text'] = value
                    checklist_key = excelParser[key]
                    field = [f for f in fields if f['label']==checklist_key]
                    if len(field) > 0 and 'units' in field[0].keys():
                        dict['unit'] = field[0]['units']                     
                    checklist_fields[checklist_key] = dict
                else:
                    dict['text'] = value
                    custom_fields[key] = dict
            sample_errors = validate_sample(checklist_fields,fields)
            if len(sample_errors) > 0:
                parsed_sample['errors'] = sample_errors
            else:
                parsed_sample['checkListFields'] = checklist_fields
                parsed_sample['customFields'] = custom_fields
            parsed_samples.append(parsed_sample)
    return parsed_samples

def validate_sample(checklist_fields,fields):
    sample_errors=[]
    for field in fields:
        key = field['label'] if field['label'] in checklist_fields.keys() else None
        value = checklist_fields[key]['text'] if key else None
        label = list(excelParser.keys())[list(excelParser.values()).index(field['label'])] if field['label'] in excelParser.values() else None
        if value:
            if 'regex' in field.keys() and checklist_fields[key]:
                pattern = field['regex']
                if isinstance(value, type(datetime.datetime(2021,12,30))):
                    value = str(value.date().isoformat())
                if not bool(re.match(pattern, str(value))):
                    sample_errors.append({'label': label, 'message': f'this field format is wrong, expected format: {pattern}'})
            elif 'units' in field.keys() and checklist_fields[key]:
                if not is_number(checklist_fields[field['label']]):
                    sample_errors.append({'label': label, 'message':'this field requires an Integer or a Float'})
            elif 'options' in field.keys() and checklist_fields[key]:
                options = field['options']
                if not checklist_fields[key]['text'] in options:
                    sample_errors.append({'label': label, 'message': f'this field must contain one of the following values: {options}'})
        elif field['mandatory'] == 'mandatory' and field['label'] not in checklist_fields.keys():
            sample_errors.append({ 'label': label, 'message':'this field is mandatory'})
        else:
            continue
    return sample_errors

def is_number(string):
    try:
        float(string)
        return True
    except ValueError:
        return False

def create_submission_xml(value):
    submission = ET.Element('SUBMISSION')
    actions = ET.SubElement(submission, 'ACTIONS')
    action = ET.SubElement(actions, 'ACTION')
    if value == 'ADD':
        type = ET.SubElement(action, 'ADD')
    elif value == 'MODIFY':
        type = ET.SubElement(action, 'MODIFY')
    elif value == 'CANCEL':
        type = ET.SubElement(action, 'CANCEL', attrib={'target': 'TEST'})
    return submission
        
def create_xml(samples):
    sample_set = ET.Element('SAMPLE_SET')
    for sample_object in samples:
        app.logger.info(sample_object)
        sample = ET.SubElement(sample_set,'SAMPLE',attrib={'alias':sample_object['sample unique name']['text']})
        sample_name = ET.SubElement(sample,'SAMPLE_NAME')
        scientific_name = ET.SubElement(sample_name, 'SCIENTIFIC_NAME')
        scientific_name.text = sample_object['scientificName']['text']
        taxon_id = ET.SubElement(sample_name, 'TAXON_ID')
        taxon_id.text = str(sample_object['taxid']['text']) 
        sample_attributes = ET.SubElement(sample, 'SAMPLE_ATTRIBUTES')
        checklist_attr = ET.SubElement(sample_attributes, 'SAMPLE_ATTRIBUTE')
        checklist_tag = ET.SubElement(checklist_attr, 'TAG')
        checklist_tag.text = 'ENA-CHECKLIST'
        checkilist_value = ET.SubElement(checklist_attr, 'VALUE')
        checkilist_value.text = 'ERC000053'
        for key in sample_object.keys():
            if key == 'sample unique name' or key == 'taxid' or key == 'scientificName ':
                continue
            else:
                sample_attr = ET.SubElement(sample_attributes, 'SAMPLE_ATTRIBUTE')
                tag = ET.SubElement(sample_attr, 'TAG')
                tag.text = key
                value = ET.SubElement(sample_attr, 'VALUE')
                value.text = sample_object[key]['text']
                if 'unit' in sample_object[key].keys():
                    units = ET.SubElement(sample_attr, 'UNITS')
                    units.text = sample_object[key]['unit']
                    value.text = str(float(value.text))
    return sample_set