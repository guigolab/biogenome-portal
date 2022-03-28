import datetime
import re
from db.models import SecondaryOrganism
from utils.constants import CHECKLIST_FIELD_GROUPS,MANIFEST_TO_MODEL
from utils.ena_client import check_taxons_from_NCBI
from flask import current_app as app

def get_sample_values(header,row):
    values = {}
    for key, cell in zip(header, row):
        if not cell.value:
            continue
        else:
            values[key] = cell.value
    return values

def validator_helper(sheet_obj, header_index, header):
    fields = get_checklist_fields(CHECKLIST_FIELD_GROUPS)
    samples_mapper={}
    errors_mapper={}
    for index, row in enumerate(list(sheet_obj.rows)[header_index:]):
        row_position = str(index+header_index+1)
        values = get_sample_values(header,row)
        samples_mapper[str(row_position)] = values
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
            errors_mapper[str(row_position)] = errors
    #check duplicated ids and validate tax ids
    taxids_to_validate=[str(int(samples_mapper[key]['taxon_id'])) for key in samples_mapper.keys() if 'taxon_id' in samples_mapper[key].keys()]
    if len(taxids_to_validate) > 0:
        NCBI_errors(taxids_to_validate, errors_mapper)
    ids = [samples_mapper[key]['tube_or_well_id'] for key in samples_mapper.keys() if 'tube_or_well_id' in samples_mapper[key].keys()]
    if len(ids) > 0:
        check_dups(ids, samples_mapper, errors_mapper)
    filtered_errors = {key: value for key, value in errors_mapper.items() if len(value) > 0}
    return filtered_errors

def sample_parser_helper(sheet_obj, header_index, header):
    fields = get_checklist_fields(CHECKLIST_FIELD_GROUPS)
    samples=list()
    for index, row in enumerate(list(sheet_obj.rows)[header_index:]):
        values = get_sample_values(header,row)
        if len(values.keys()) > 2: #some value is present
            sample=dict()
            for key, value in values.items():
                if key in MANIFEST_TO_MODEL.keys():
                    if len(MANIFEST_TO_MODEL[key]) > 1 and len(values) > 1:
                        values = value.split('|')
                        sample[MANIFEST_TO_MODEL[key][0]] = str(values[0])
                        sample[MANIFEST_TO_MODEL[key][1]] = str(','.join(values[1:]))
                    else:
                        sample[MANIFEST_TO_MODEL[key][0]] = str(value)
                if key in [field['model'] for field in fields]:
                    if isinstance(value, type(datetime.datetime(2021,12,30))):
                        sample[key] = value.date().isoformat()
                    else:
                        sample[key] = str(value)
                #     continue ##custom fields??
            samples.append(sample)
    return samples

def check_dups(ids, samples_mapper, errors_mapper):
    unique_ids=set()
    if len(ids) != len(set(ids)):
        duplicates = [id for id in ids if id in unique_ids or unique_ids.add(id)]
        for key in samples_mapper.keys():
            if 'tube_or_well_id' in samples_mapper[key].keys() and \
                samples_mapper[key]['tube_or_well_id'] in duplicates:
                error={'label': 'tube_or_well_id', 'message': f'this tube_or_well_id: is duplicated!'}
                errors_mapper[key].append(error)

def NCBI_errors(taxids_to_validate, errors_mapper):
    response = check_taxons_from_NCBI(taxids_to_validate)
    if response and 'taxonomy_nodes' in response.keys():
        NCBI_validation = response['taxonomy_nodes']
        for ncbi_taxa in NCBI_validation:
            if 'errors' in ncbi_taxa.keys():
                sample = next([errors_mapper[key] for key in errors_mapper.keys() if str(int(errors_mapper[key]['taxon_id'])) == ncbi_taxa['query'][0]])
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

#return samples to create
def manage_existing_samples(samples, import_option):
    new_samples=list()
    updated_samples=list()
    app.logger.info(import_option)
    for sample in samples:
        sec_organism = SecondaryOrganism.objects(tube_or_well_id=sample['tube_or_well_id']).first()
        if sec_organism:
            if import_option == 'SKIP':
                continue
            else:
                sec_organism.modify(**sample)
                updated_samples.append(sec_organism.tube_or_well_id)
        else:
            new_samples.append(sample)
    return new_samples, updated_samples
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
