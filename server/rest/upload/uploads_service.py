import openpyxl
from db.models import BrokerSource, LocalSample,Organism
import itertools
from utils.helpers import organism as organism_helper, taxonomy as taxonomy_helper, user as user_helper, geolocation as geoloc_helper


OPTIONS = ['SKIP','UPDATE']

def parse_excel(excel=None, id=None, taxid=None, scientific_name=None, header=1, option="SKIP", source=None):
    
    #VALIDATE PARAMS
    param_errors = validate_params(excel, header, source)
    if param_errors:
        return param_errors, 400


    
    wb_obj = openpyxl.load_workbook(excel, data_only=True)
    sheet_obj = wb_obj.active

    #GET HEADER ROW
    header_row = get_header_row(sheet_obj, header)

    mandatory_fields = {'Local Id': id, 'taxid': taxid, 'Scientific name': scientific_name}

    #VALIDATE HEADER 
    param_errors.extend(validate_header(header_row, mandatory_fields))

    #VALIDATE OPTION
    param_errors.extend(validate_option(option))

    if param_errors:
        return param_errors, 400
    
    header = int(header)
    rows_to_process = itertools.islice(sheet_obj.rows, header, None)
    #PROCESS ROWS
    errors, samples = process_rows(rows_to_process, header_row, header, mandatory_fields)

    if errors:
        return errors, 400

    ##MAP SAMPLES INTO DB MODEL
    mapped_samples = map_samples(samples, id, source, scientific_name, taxid)

    taxids = set([s.taxid for s in mapped_samples])

    user = user_helper.get_current_user()

    #VALIDATE TAXONOMY: USER HAS PERMISSION OR TAXON EXISTS IN INSDC
    errors, new_taxons_to_parse = taxonomy_helper.validate_taxonomy(user,taxids)

    if errors:
        return errors, 400

    saved_or_updated_samples = save_or_update_local_samples(mapped_samples, option, source)

    if new_taxons_to_parse:

        organism_helper.create_organisms_and_related_taxons_from_ncbi_datasets(new_taxons_to_parse)
        user_helper.add_species_to_datamanager([t.taxid for t in new_taxons_to_parse], user)


    update_organisms(taxids, user)
    # create_or_update_organisms(new_taxons_to_parse, existing_organisms, user)

    return saved_or_updated_samples, 200



def update_organisms(taxids, user):
    organisms = Organism.objects(taxid__in=taxids)
    organisms.save()
    user_helper.add_species_to_datamanager(taxids, user)

def save_or_update_local_samples(mapped_samples, option, source):

    existing_local_samples = LocalSample.objects(local_id__in=[s.local_id for s in mapped_samples])
    saved_or_updated_samples = []
    for s in mapped_samples:
        message = None
        existing_sample = existing_local_samples.filter(local_id=s.local_id).first()
        
        if existing_sample:
            if option == 'UPDATE':
                existing_sample.update(taxid=s.taxid,broker=source,metadata=s.metadata)
                existing_sample.reload()
                geoloc_helper.save_coordinates(existing_sample,'local_id')
                geoloc_helper.update_countries_from_biosample(existing_sample, existing_sample.local_id)
                message = f"Sample {existing_sample.local_id} updated!"
            
            else:

                message = f"Sample {existing_sample.local_id} skipped!"
                continue
        else:
            s.save()
            geoloc_helper.save_coordinates(s, 'local_id')
            geoloc_helper.update_countries_from_biosample(s, s.local_id)
            message=f"Sample {s.local_id} saved!"

        saved_or_updated_samples.append({s.local_id:message})
    return saved_or_updated_samples

def map_samples(samples, id, source, scientific_name, taxid):
    mapped_samples = []
    for s in samples:
        str_taxid = str(s.get(taxid))
        s_to_save = LocalSample(taxid=str_taxid,local_id=s[id],broker=source,metadata=s['metadata'],scientific_name=s[scientific_name])
        mapped_samples.append(s_to_save)
    return mapped_samples

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