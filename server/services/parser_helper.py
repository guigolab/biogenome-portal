import datetime
from tempfile import NamedTemporaryFile
import openpyxl
from openpyxl import Workbook
import re
from db.models import Organism, SecondaryOrganism
from utils.constants import CHECKLIST_FIELD_GROUPS,MANIFEST_HEADER,IMPORT_OPTIONS,MANIFEST_TO_MODEL
from utils.ena_client import check_taxons_from_NCBI
from flask import current_app as app

#implement parser modularity
# validation module
# parser module
def get_sample_values(header,row):
    values = {}
    for key, cell in zip(header, row):
        if not cell.value:
            continue
        else:
            values[key] = cell.value
    return values

# return samples(rows)
def parse_excel(excel, opts):
    header_index = int(opts['headerIndex']) if 'headerIndex' in opts.keys() else 1
    import_option= opts['importOption'] if 'importOption' in opts.keys() and opts['importOption'] in IMPORT_OPTIONS else 'SKIP'
    wb_obj = openpyxl.load_workbook(excel,data_only=True)
    sheet_obj = wb_obj.active
    header = [cell.value.lower() for cell in sheet_obj[header_index] if cell.value]
    fields = get_checklist_fields(CHECKLIST_FIELD_GROUPS) #retrieve manifest in future
    #retrieve all taxids to be validated
    #check uniqueness of tube or well id in the excel
    valid_samples=list()
    samples_with_errors={}
    #save samples only if all of them are valid, otherwise return errors
    samples_to_save={}
    for index, row in enumerate(list(sheet_obj.rows)[header_index:]):
        row_position = str(index+header_index+1)
        values = get_sample_values(header,row)
        samples_to_save[str(row_position)] = values
        if len(values.keys()) > 2: #some value is present
            ##check if mandatory fields are empty
            errors=list()
            errors.extend(check_mandatory_fields(values,fields))
            for key, value in values.items():
                #validate mandatory fields
                if key in MANIFEST_TO_MODEL.keys():
                    model_fields = [field for field in fields if field['model'] in MANIFEST_TO_MODEL[key]]
                model_fields = [field for field in fields if field['model'] == key]
                for field in model_fields:
                    errors.extend(validate_value(field, key, value))
            samples_with_errors[str(row_position)] = errors
    #check duplicated ids and validate tax ids
    taxids_to_validate=[str(int(samples_to_save[key]['taxon_id'])) for key in samples_to_save.keys() if 'taxon_id' in samples_to_save[key].keys()]
    if len(taxids_to_validate) > 0:
        NCBI_errors(taxids_to_validate, samples_with_errors)
    ids = [samples_to_save[key]['tube_or_well_id'] for key in samples_to_save.keys() if 'tube_or_well_id' in samples_to_save[key].keys()]
    if len(ids) > 0:
        check_dups(ids, samples_to_save, samples_with_errors)
    #return if errors are present
    filtered_errors = {key: value for key, value in samples_with_errors.items() if len(value) > 0}
    if len(filtered_errors.keys()) > 0:
        return [], filtered_errors
    
    ##parse and save sample
    ##controls what to do with already existing samples


def check_dups(ids, samples_to_save, samples_with_errors):
    unique_ids=set()
    if len(ids) != len(set(ids)):
        duplicates = [id for id in ids if id in unique_ids or unique_ids.add(id)]
        for key in samples_to_save.keys():
            if 'tube_or_well_id' in samples_to_save[key].keys() and \
                samples_to_save[key]['tube_or_well_id'] in duplicates:
                error={'label': 'tube_or_well_id', 'message': f'this tube_or_well_id: is duplicated!'}
                samples_with_errors[key].append(error)

def NCBI_errors(taxids_to_validate, samples_with_errors):
    response = check_taxons_from_NCBI(taxids_to_validate)
    if response and 'taxonomy_nodes' in response.keys():
        NCBI_validation = response['taxonomy_nodes']
        for ncbi_taxa in NCBI_validation:
            if 'errors' in ncbi_taxa.keys():
                sample = next([samples_with_errors[key] for key in samples_with_errors.keys() if str(int(samples_with_errors[key]['taxon_id'])) == ncbi_taxa['query'][0]])
                sample['errors'].append({'label':'taxon_id','message':ncbi_taxa['errors'][0]['reason']})

def validate_value(field, key, value):
    #check for mandatory fields
    errors=list()
    if field['model'] == 'taxid' and not is_number(value):
        errors.append({'label': key, 'message': f'must be a numeric value'})
    if 'regex' in field.keys():
        pattern = field['regex']
        if isinstance(value, type(datetime.datetime(2021,12,30))):
            value = str(value.date().isoformat())
        if not bool(re.match(pattern, str(value))):
            errors.append({'label': key, 'message': f'this field format is wrong, expected format: {pattern}, got {value}'})
    if 'units' in field.keys():
        if not is_number(value):
            errors.append({'label': key, 'message':f'this field requires an Integer or a Float, got {value}'})
    if 'options' in field.keys():
        options = field['options']
        for val in value.split('|'):
            if not any(val.lower().strip() == opt.lower() for opt in options):
                errors.append({'label': key, 'message': f'this field must contain one of the following values: {options}, got {val}'})
    return errors

#return unique taxids
def get_checklist_fields(groups):
    fields = list()
    for group in groups:
        fields.extend(group['fields'])
    return fields

def check_mandatory_fields(sample, fields):
    errors=list()
    #fields to be specifically managed
    model_fields=list()
    for value in MANIFEST_TO_MODEL.values():
        model_fields.extend(value)
    mandatory_fields=[field['model'] for field in fields if field['mandatory'] == 'mandatory' and field['model'] not in model_fields]
    #different fields between manifest and model
    fields_to_parse = [key for key in MANIFEST_TO_MODEL.keys() if key not in sample.keys()]
    if len(fields_to_parse) > 0:
        for field in fields_to_parse:
            errors.append({'label': field, 'message': f'the {field} field is mandatory'})
    for mandatory_field in mandatory_fields:
        if not mandatory_field in sample.keys() :
            errors.append({'label':mandatory_field,'message':f'the {mandatory_field} field is mandatory'})
    return errors

def is_number(string):
    try:
        float(string)
        return True
    except ValueError:
        return False
