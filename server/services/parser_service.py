import datetime
from tempfile import NamedTemporaryFile
import openpyxl
from openpyxl.utils import get_column_letter
from openpyxl import Workbook
import re
from db.models import Organism, SecondaryOrganism
from utils.constants import CHECKLIST_FIELD_GROUPS,MANIFEST_HEADER
from utils.ena_client import check_taxons_from_NCBI

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
    header = [cell.value.lower() for cell in sheet_obj[1]]
    samples = list()
    fields = get_checklist_fields(CHECKLIST_FIELD_GROUPS)
    #retrieve all taxids to be validated
    taxids_to_validate = get_taxids_to_validate(sheet_obj, 'TAXON_ID')
    samples_with_errors=list()
    NCBI_validation = list()
    if len(taxids_to_validate) > 0:
        response = check_taxons_from_NCBI(taxids_to_validate)
        if response and 'taxonomy_nodes' in response.keys():
            NCBI_validation = response['taxonomy_nodes']
    for index, row in enumerate(list(sheet_obj.rows)[1:]):
        values = get_sample_values(header,row)
        if len(values.keys()) > 2:
            errors = validate_sample(index+2,values,fields,NCBI_validation)
            if 'errors' in errors.keys():
                samples_with_errors.append(errors)
            else:
                parsed_sample = parse_sample(values,fields,NCBI_validation)
                samples.append(parsed_sample)
    return samples, samples_with_errors

#return unique taxids
def get_taxids_to_validate(sheet_obj, column_name):
    taxids_to_validate=list()
    column_index = [get_column_letter(cell.column) for cell in sheet_obj[1] if cell.value == column_name]
    if len(column_index) == 1:
        column = sheet_obj[column_index[0]]
        for cell in column[1:]:
            if cell.value and is_number(cell.value):
                taxids_to_validate.append(str(cell.value))
    taxids_to_validate=list(set(taxids_to_validate))
    if len(Organism.objects()) > 0:
        existing_taxids = [org.taxid for org in Organism.objects(taxid__in=taxids_to_validate)]
        taxids_to_validate = [taxid for taxid in taxids_to_validate if taxid not in existing_taxids]
    return taxids_to_validate


def get_checklist_fields(groups):
    fields = list()
    for group in groups:
        fields.extend(group['fields'])
    return fields

def check_mandatory_fields(errors,NCBI_response,sample,fields):
    mandatory_fields=[field['model'] for field in fields if field['mandatory'] == 'mandatory']
    for mandatory_field in mandatory_fields:
        if mandatory_field == 'geographic_location_country' or 'geographic_location_region_and_locality':
            if not 'collection_location' in sample.keys():
                errors.append({'label':'collection_location','message':'the collection_location field is mandatory'})
            else:
                if len(sample['collection_location'].split('|')) < 1:
                    errors.append({'label':'collection_location','message':'please add a region after the country separated by |'})
        elif mandatory_field == 'collecting_institution' and not 'collector_affiliation' in sample.keys:
            errors.append({'label':'collector_affiliation','message':'the collector_affiliation field is mandatory'})
        elif mandatory_field == 'project_name':
            continue ## set the project name from env
        elif mandatory_field == 'taxid':
            if not 'taxon_id' in sample.keys():
                errors.append({'label':'taxon_id','message':'the taxon_id field is mandatory'})
            else:
                taxid = str(sample['taxon_id'])
                for ncbi_taxa in NCBI_response:
                    if ncbi_taxa['query'][0] == taxid:
                        if 'errors' in ncbi_taxa.keys():
                            errors.append({'label':'taxon_id','message':ncbi_taxa['errors'][0]['reason']})
        elif mandatory_field == 'geographic_location_longitude' and not 'decimal_longitude' in sample.keys():
            errors.append({'label':'decimal_longitude','message':'the decimal_longitude field is mandatory'})
        elif mandatory_field == 'geographic_location_latitude' and not 'decimal_latitude' in sample.keys():
            errors.append({'label':'decimal_latitude','message':'the decimal_latitude field is mandatory'})
        elif mandatory_field == 'collection_date' and not 'date_of_collection' in sample.keys():
            errors.append({'label':'date_of_collection','message':'the date_of_collection field is mandatory'})
        elif not mandatory_field in sample.keys():
            errors.append({'label':mandatory_field,'message':f'the {mandatory_field} field is mandatory'})
    return errors

def validate_sample(index, sample, fields, NCBI_response):
    sample_with_error = {'index': index}
    errors = list()
    check_mandatory_fields(errors, NCBI_response, sample, fields)
    for key, value in sample.items():
        model_fields = [field['model'] for field in fields]
        #erga manifest/ena checklist validation
        if key in model_fields:
            field = next(field for field in fields if field['model'] == key)
            field_error = validate_field(value, field, index)          
            if field_error:
                errors.append(field_error)
        elif key == 'collection_location':
            locations = [loc.strip() for loc in value.split('|')]
            if len(locations) > 1:
                country_error = validate_field(locations[0], next(field for field in fields if field['model'] == 'geographic_location_country'),index)
                if country_error:
                    errors.append(country_error)
        elif key == 'decimal_longitude':
            longitude_error = validate_field(value, next(field for field in fields if field['model'] == 'geographic_location_longitude'), index)
            if longitude_error:
                errors.append(longitude_error)
        elif key == 'decimal_latitude':
            latitude_error = validate_field(value, next(field for field in fields if field['model'] == 'geographic_location_latitude'), index)
            if latitude_error:
                errors.append(latitude_error)
        elif key == 'date_of_collection':
            date_error = validate_field(value, next(field for field in fields if field['model'] == 'collection_date'), index)
            if date_error:
                errors.append(date_error)
    if len(errors) > 0:
        sample_with_error['errors'] = errors
    return sample_with_error


def parse_sample(sample,fields,NCBI_response):
    parsed_sample=dict()
    for key, value in sample.items():
        model_fields = [field['model'] for field in fields]
        if key == 'collection_location':
            locations = [loc.strip() for loc in sample[key].split('|')]
            parsed_sample['geographic_location_country'] = locations[0]
            parsed_sample['geographic_location_region_and_locality'] = ''.join(locations[1:])
        elif key == 'taxon_id':
            parsed_sample['taxid'] = str(value)
            taxid = str(sample['taxon_id'])
            if any(taxid == ncbi_taxa['query'][0] for ncbi_taxa in NCBI_response):
                taxon_name = next(ncbi_taxa['taxonomy']['organism_name'] for ncbi_taxa in NCBI_response if ncbi_taxa['query'][0] == taxid)
                parsed_sample['scientificName'] = taxon_name
            else:
                parsed_sample['scientificName'] = Organism.objects(taxid=taxid).first().organism
        elif key == 'decimal_latitude':
            parsed_sample['geographic_location_latitude'] = str(value)
        elif key == 'decimal_longitude':
            parsed_sample['geographic_location_longitude'] = str(value)
        elif key == 'date_of_collection':
            parsed_sample['collection_date'] = str(value)
        elif key == 'collector_affiliation':
            parsed_sample['collecting_institution'] = value
        elif key in model_fields:
            if isinstance(value, type(datetime.datetime(2021,12,30))):
                parsed_sample[key] = value.date().isoformat()
            else:
                parsed_sample[key] = str(value)
        else:
            #TODO add custom fields to model
            continue
    return parsed_sample

def validate_field(value, field, index):
    if 'regex' in field.keys():
        pattern = field['regex']
        if isinstance(value, type(datetime.datetime(2021,12,30))):
            value = str(value.date().isoformat())
        if not bool(re.match(pattern, str(value))):
            return {'index': index, 'label': field['model'], 'message': f'this field format is wrong, expected format: {pattern}, got {value}'}
    elif 'units' in field.keys():
        if not is_number(value):
            return {'index': index, 'label': field['model'], 'message':f'this field requires an Integer or a Float, got {value}'}
    elif 'options' in field.keys():
        options = field['options']
        if not any(value.lower()==key.lower() for key in options):
            return {'index': index, 'label': field['model'], 'message': f'this field must contain one of the following values: {options}, got {value}'}

def is_number(string):
    try:
        float(string)
        return True
    except ValueError:
        return False


def create_excel():
    samples = SecondaryOrganism.objects(accession=None).as_pymongo()
    wb = Workbook()
    ws = wb.active
    ws.title='Metadata Entry'
    ws.append(MANIFEST_HEADER)

    for sample in samples:
        parsed_sample = sample_to_excel(sample,MANIFEST_HEADER)
        #convert fields 
        ordered_list = list()
        for field in MANIFEST_HEADER:
            if field in parsed_sample.keys():
                ordered_list.append(parsed_sample[field])
            else:
                ordered_list.append('')
        ws.append(ordered_list)

    with NamedTemporaryFile() as tmp:
        wb.save(tmp.name)
        return tmp.read()

def sample_to_excel(sample, header):
    formatted_sample=dict()
    fields_converter = dict(
        scientificName='scientific_name',
        geographic_location_country='collection_location',
        geographic_location_region_and_locality='collection_location', 
        collection_date='date_of_collection',
        geographic_location_longitude='decimal_longitude',
        geographic_location_latitude='decimal_latitude',
        collecting_institution='collector_affiliation')
    #format specific fields
    for key,value in fields_converter.items():
        if value == 'collection_location':
            formatted_sample[value.upper()] = sample['geographic_location_country'] + ' | ' + sample['geographic_location_region_and_locality']
        elif key in sample.keys():
                formatted_sample[value.upper()] = sample[key]
    #format fields
    for field in header:
        if field.lower() in sample.keys():
            formatted_sample[field] = sample[field.lower()]
    return formatted_sample