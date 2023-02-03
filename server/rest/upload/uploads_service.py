# from tempfile import NamedTemporaryFile
import openpyxl
from db.models import BrokerSource, LocalSample
from organism.organisms_service import get_or_create_organism
from utils import data_helper

OPTIONS = ['SKIP','UPDATE']

def parse_excel(excel=None, id=None, taxid=None, scientific_name=None, header=1, option="SKIP", source=None):

##PARAMS VALIDATION
    param_errors=list()
    if not excel:
        e=dict()
        e['excel'] = ['excel field missing']
        param_errors.append(e)

    if not source:
        source = BrokerSource.LOCAL

    elif source not in [source.value for source in BrokerSource]:
        e=dict()
        e['source'] = [f'{source} is not present in sources']
        param_errors.append(e)

    if not isinstance(header,int):
        if not header.isnumeric():
            e=dict()
            e['header'] = [f"header must be a number. header: {header}"]
            param_errors.append(e)
        else:
            header = int(header)

    if header < 1:
        e = dict()
        e['header'] = ["header must be greater than 1"]
        param_errors.append(e)

    #can't continue if file is None
    if param_errors:
        return param_errors,400

    wb_obj = openpyxl.load_workbook(excel,data_only=True)
    sheet_obj = wb_obj.active

    #check if headers are correct
    header_row = [cell.value for cell in sheet_obj[header] if cell.value]
    if not header_row:
        e = dict()
        e['header'] = [f"header can't be greater than the total rows of the excel. header: {header}"]
        param_errors.append(e)

    mandatory_fields = [dict(key='Local Id', value=id), dict(key="taxid",value=taxid), dict(key="Scientific name",value=scientific_name)]

    for field in mandatory_fields:
        if not field['value']:
            e = dict()
            e[field['key']] = [f"{field['key']} field missing"]
            param_errors.append(e)
        elif not field['value'] in header_row:
            e = dict()
            e[field['key']] = [f"{field['value']} not found in {','.join(header_row)}"]
            param_errors.append(e)

    #check if options are valid
    if not option in OPTIONS:
        e = dict()
        e['import options'] = [f"option must be SKIP or UPDATE, current is: {option}"]
        param_errors.append(e)

    if param_errors:
        return param_errors,400


##EXCEL PARSING
    all_errors = list()
    saved_samples = list()
    for index, row in enumerate(list(sheet_obj.rows)[header:]):
        
        ##check if the row contains something, at least three cells
        values = len([cell.value for cell in row if cell.value])
        if values < 3:
            continue

        sample_error_obj=dict()
        sample_error_obj[index+header+1] = []
        new_sample = dict(metadata=dict())
        for key, cell in zip(header_row,row):
            if 'orcid' in key.lower():
                continue ## skip orcid related fields maybe private
            if key in [f['value'] for f in mandatory_fields]:
                if not cell.value:
                    msg = f"{key} field is mandatory"
                    sample_error_obj[index+header+1].append(msg)
                else:
                    new_sample[key] = str(cell.value).strip()
            if cell.value:
                new_sample['metadata'][key] = cell.value
        
        if sample_error_obj[index+header+1]:
            all_errors.append(sample_error_obj)
            continue

        ##continue if errors are present
        if all_errors:
            continue

        saved_sample=dict()
        sample_obj = LocalSample.objects(local_id = new_sample[id]).first()
        if sample_obj:
            if option == 'SKIP':
                continue
            elif option == 'UPDATE':
                sample_obj.update(taxid=new_sample[taxid],local_id=new_sample[id],broker=source,metadata=new_sample['metadata'],scientific_name=new_sample[scientific_name])
                saved_sample[index+1+header] = [f"{sample_obj.local_id} correctly updated"]
        else:
            organism = get_or_create_organism(new_sample[taxid])
            if not organism:
                msg = 'TAXID not found in NCBI'
                sample_error_obj[index+header+1].append(msg)
                all_errors.append(sample_error_obj)
                continue
            sample_obj = LocalSample(taxid=new_sample[taxid],local_id=new_sample[id],broker=source,metadata=new_sample['metadata'],scientific_name=new_sample[scientific_name]).save()                
            data_helper.create_coordinates(sample_obj,organism)
            organism.local_samples.append(sample_obj.local_id)
            organism.save()
            saved_sample[index+1+header] = [f"{sample_obj.local_id} correctly saved"]
        saved_samples.append(saved_sample)

    if all_errors:
        return all_errors,400
    return saved_samples,201
