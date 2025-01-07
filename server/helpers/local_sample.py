from db.models import BrokerSource

OPTIONS = ['SKIP','UPDATE']

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
        param_errors.append("èxcel field is missing")

    sources = [source.value for source in BrokerSource
               ]
    if not source:
        source = BrokerSource.LOCAL
    elif source not in sources:
        message = "'source field must be" + ", ".join(sources)
        param_errors.append(message)
    try:
        header = int(header)
        if header < 1:
            param_errors.append("header must be greater than 1")
    except ValueError:
        param_errors.append("header must be an int number")
    return param_errors


def validate_and_check_options(header_row, mandatory_fields, option):
    errors = []
    errors.extend(validate_header(header_row, mandatory_fields))
    if option not in OPTIONS:
        errors.append(f"option must be {' or '.join(OPTIONS)}, current is: {option}")
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
            errors.append(f"{field} field missing")
        elif value not in header_row:
            errors.append(f"{value} not found in {', '.join(header_row)}")

    return errors
