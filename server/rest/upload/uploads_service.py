from db.models import BrokerSource,Organism
from helpers import user as user_helper, taxonomy as taxonomy_helper
from jobs import local_samples_upload
from celery.result import AsyncResult
from werkzeug.exceptions import NotFound
import openpyxl
import itertools

OPTIONS = ['SKIP','UPDATE']

def parse_excel(excel=None, id=None, taxid=None, scientific_name=None, header=1, option="SKIP", source=None):
    
    param_errors = validate_params(excel, header, source)
    if param_errors:
        return param_errors, 400

    errors = []
    wb_obj = openpyxl.load_workbook(excel, data_only=True)
    sheet_obj = wb_obj.active

    header = int(header)

    header_row = get_header_row(sheet_obj, header)

    mandatory_fields = {'Local Id': id, 'taxid': taxid, 'Scientific name': scientific_name}

    errors = validate_and_check_options(header_row, mandatory_fields, option)
    if errors:
        return errors, 400
    
    rows_to_process = itertools.islice(sheet_obj.rows, header, None)

    errors, samples = process_rows(rows_to_process, header_row, header, mandatory_fields)

    if errors:
        return errors, 400
    
    mapped_samples = map_samples_to_dict(samples, id, source, scientific_name, taxid)

    user = user_helper.get_current_user()

    if not user:
        return [{'user': 'User not found'}], None

    taxids = list(set(str(s.get('taxid')) for s in mapped_samples))

    existing_taxids = list(Organism.objects(taxid__in=taxids).scalar('taxid'))
    if existing_taxids:
        taxonomy_errors = taxonomy_helper.check_species_permission(user, existing_taxids)
        
        if taxonomy_errors:
            return taxonomy_errors, 400
    
    task = local_samples_upload.upload_samples_spreadsheet.delay(user.name, mapped_samples, option, source)
    # create_or_update_organisms(new_taxons_to_parse, existing_organisms, user)
    return dict(id=task.id, state=task.state ), 200



def map_samples_to_dict(samples, id, source, scientific_name, taxid):
    mapped_samples = []
    for s in samples:
        str_taxid = str(s.get(taxid))
        s_to_save = dict(taxid=str_taxid,local_id=s[id],broker=source,metadata=s['metadata'],scientific_name=s[scientific_name])
        mapped_samples.append(s_to_save)
    return mapped_samples


def validate_params(excel, header, source):
    param_errors = []

    if not excel:
        param_errors.append({'excel': ['excel field missing']})

    if not source:
        source = BrokerSource.LOCAL
    elif source not in [source.value for source in BrokerSource]:
        param_errors.append({'source': [f'{source} is not present in sources']})

    try:
        header = int(header)
        if header < 1:
            raise ValueError("header must be greater than 1")
    except ValueError:
        param_errors.append({'header': [f"header must be a number. header: {header}"]})

    return param_errors


def validate_and_check_options(header_row, mandatory_fields, option):
    errors = []
    errors.extend(validate_header(header_row, mandatory_fields))
    errors.extend(validate_option(option))
    return errors

def process_rows(rows, header_row, header, mandatory_fields):
    all_errors = []
    parsed_samples = []
    for index, row in enumerate(rows):
        values = len([cell.value for cell in row if cell.value])
        if values < 2:
            continue

        sample_error_obj, new_sample = process_row(header_row, header, mandatory_fields, row, index)

        if sample_error_obj:
            all_errors.append(sample_error_obj)
            continue
        parsed_samples.append(new_sample)

    return all_errors, parsed_samples

def process_row(header_row, header, mandatory_fields, row, index):
    sample_error_obj = {index + header + 1: []}
    new_sample = {'metadata': {}}
    for key, cell in zip(header_row, row):
        if 'orcid' in key.lower():
            continue
        if key in [f for f in mandatory_fields.values()]:
            if not cell.value:
                msg = f"{key} field is mandatory"
                sample_error_obj[index + header + 1].append(msg)
            else:
                new_sample[key] = str(cell.value).strip()
        if cell.value:
            new_sample['metadata'][key] = str(cell.value)

    if sample_error_obj[index + header + 1]:
        return sample_error_obj, new_sample
    
    return None, new_sample

def get_header_row(sheet_obj, header):
    return [cell.value for cell in sheet_obj[header] if cell.value]

def validate_header(header_row, mandatory_fields):
    errors = []
    for field, value in mandatory_fields.items():
        if not value:
            errors.append({field: [f"{field} field missing"]})
        elif value not in header_row:
            errors.append({field: [f"{value} not found in {', '.join(header_row)}"]})

    return errors

def validate_option(option):
    if option not in OPTIONS:
        return [{'import options': [f"option must be SKIP or UPDATE, current is: {option}"]}]
    return []

def get_task_status(task_id):
    task = AsyncResult(task_id)
    if task.result:
        print(task.result)
        return dict(messages=task.result['messages'], state=task.state )
    raise NotFound(description=f"{task_id} not found")