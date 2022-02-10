import datetime
import openpyxl
from flask import current_app as app
import re
from db.models import SecondaryOrganism
from utils.constants import EXCEL_PARSER,CHECKLIST_PARSER,EXCEL_MANDATORY_FIELDS

def get_sample_values(header,row):
    values = {}
    for key, cell in zip(header, row):
        if not cell.value:
            continue
        else:
            values[key] = cell.value
    return values

# return samples(rows)
def parse_excel(excel):
    wb_obj = openpyxl.load_workbook(excel,data_only=True)
    sheet_obj = wb_obj.active
    header = [cell.value for cell in sheet_obj[1]]
    samples = list()
    for row in list(sheet_obj.rows)[1:]:
        values = get_sample_values(header,row)
        if len(values.keys()) > 2:
            samples.append(values)
    return samples

def get_checklist_fields(groups):
    fields = list()
    for group in groups:
        fields.extend(group['fields'])
    return fields

def validate_samples(samples_to_validate,fields):
    samples = list()
    app.logger.info('INSIDE VALIDATE SAMPLES')
    if len(samples_to_validate) > 0:
        for index, sample in enumerate(samples_to_validate):

            sample_with_error = {'index': index+2 }
            errors=list()
            for mandatory_field in EXCEL_MANDATORY_FIELDS:
                if not mandatory_field in sample.keys():
                    errors.append({'label':mandatory_field,'message':f'the {mandatory_field} field is mandatory'})
                elif mandatory_field == 'SAMPLE_UNIQUE_NAME':
                    sample_unique_name = str(sample[mandatory_field])
                    sample_model = SecondaryOrganism.objects(sample_unique_name=sample_unique_name).first()
                    if sample_model:
                        errors.append({'label':'SAMPLE_UNIQUE_NAME','message':f'A sample with ID: {sample_unique_name} already exists'})
            for key, value in sample.items():
                if key in EXCEL_PARSER.keys():
                    #first validate and then format
                    field = [f for f in fields if f['label']==EXCEL_PARSER[key]][0] 
                    field_error = validate_field(value, field, index+2)          
                    if field_error:
                        errors.append(field_error)
            if len(errors) > 0:
                sample_with_error['errors'] = errors
                samples.append(sample_with_error)
    return samples


def parse_samples(samples,fields):
    parsed_samples=list()
    for sample in samples:
        parsed_sample=dict()
        app.logger.info('DATE_OF_COLLECTION' in EXCEL_PARSER.keys())
        for key, value in sample.items():
            if key in EXCEL_PARSER.keys():
                # app.logger.info(key)
                field = [f for f in fields if f['label']==EXCEL_PARSER[key]][0] 
                model_attr = CHECKLIST_PARSER[EXCEL_PARSER[key]]
                if isinstance(value, type(datetime.datetime(2021,12,30))):
                    parsed_sample[model_attr] = value.date().isoformat()
                elif 'units' in field.keys():
                    obj = {'text': str(value), 'unit': field['units']}
                    parsed_sample[model_attr] = obj
                else:
                    parsed_sample[model_attr] = str(value)
            else:
                #TODO add custom fields to model
                continue
        parsed_samples.append(parsed_sample)
    return parsed_samples

def validate_field(value, field, index):
    if 'regex' in field.keys():
        pattern = field['regex']
        if isinstance(value, type(datetime.datetime(2021,12,30))):
            value = str(value.date().isoformat())
        if not bool(re.match(pattern, str(value))):
            return {'index': index, 'label': field['label'], 'message': f'this field format is wrong, expected format: {pattern}, got {value}'}
    elif 'units' in field.keys():
        if not is_number(value):
            return {'index': index, 'label': field['label'], 'message':f'this field requires an Integer or a Float, got {value}'}
    elif 'options' in field.keys():
        options = field['options']
        if not any(value.lower()==key.lower() for key in options):
            return {'index': index, 'label': field['label'], 'message': f'this field must contain one of the following values: {options}, got {value}'}

def is_number(string):
    try:
        float(string)
        return True
    except ValueError:
        return False