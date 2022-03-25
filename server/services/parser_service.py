from tempfile import NamedTemporaryFile
import openpyxl
from openpyxl import Workbook
from db.models import SecondaryOrganism
from utils.constants import MANIFEST_HEADER
from flask import current_app as app

def get_sample_values(header,row):
    values = {}
    for key, cell in zip(header, row):
        if cell.value:
            values[key] = cell.value            
    return values

# return samples(rows)
def parse_excel(excel, header_index):
    wb_obj = openpyxl.load_workbook(excel,data_only=True)
    sheet_obj = wb_obj.active
    header = [cell.value.lower() for cell in sheet_obj[header_index] if cell.value]
    #validations
    return sheet_obj, header, header_index

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
    formatted_sample=dict(TAXON_ID=sample['taxid'])
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