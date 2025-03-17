from db.models import BrokerSource
import csv
import xml.etree.ElementTree as ET
import re
from io import StringIO

def parse_ena_checklist(xml_file):
    """Parses the ENA checklist XML and extracts field definitions."""
    tree = ET.parse(xml_file)
    root = tree.getroot()
    
    fields = []
    regex_constraints = {}
    mandatory_fields = []

    for field_group in root.findall(".//FIELD_GROUP"):
        for field in field_group.findall("FIELD"):
            name = field.find("NAME").text.strip()
            mandatory = field.find("MANDATORY").text.strip().lower()
            regex_value = field.find(".//REGEX_VALUE")

            fields.append(name)

            if mandatory == "mandatory":
                mandatory_fields.append(name)
            
            if regex_value is not None:
                regex_constraints[name] = regex_value.text.strip()
    
    return fields, mandatory_fields, regex_constraints


def generate_tsv_template(xml_file):
    """Generates a TSV template based on the ENA checklist XML."""
    fields, _, _ = parse_ena_checklist(xml_file)
    with StringIO() as writer_file:
        tsv = csv.writer(writer_file, delimiter='\t')
        tsv.writerow(fields)  # Write headers
        tsv.writerow(["" for _ in fields])  

    tsv_file = writer_file.getvalue()
    filename = "template.tsv"
    
    return tsv_file.encode('utf-8'), filename


def validate_tsv_against_xml(xml_file, tsv_file):
    """Validates a TSV file against the ENA checklist XML."""
    fields, mandatory_fields, regex_constraints = parse_ena_checklist(xml_file)

    # Read TSV file
    with open(tsv_file, "r") as f:
        reader = csv.DictReader(f, delimiter="\t")
        rows = list(reader)

    # Check if all mandatory fields are present
    missing_fields = [field for field in mandatory_fields if field not in reader.fieldnames]
    if missing_fields:
        raise ValueError(f"Missing mandatory fields in TSV: {missing_fields}")

    # Validate each row
    errors = []
    for row_idx, row in enumerate(rows, start=1):
        for field, regex in regex_constraints.items():
            if field in row and row[field].strip():
                if not re.match(regex, row[field].strip()):
                    errors.append(f"Row {row_idx}: Invalid format in '{field}' - {row[field]}")

    if errors:
        raise ValueError("\n".join(errors))

    print("TSV validation passed successfully!")


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
