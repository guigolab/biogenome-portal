from db.models import LocalSample, Organism
from werkzeug.exceptions import NotFound,Unauthorized, BadRequest
from helpers import local_sample as excel_helper, taxonomy as taxonomy_helper, user as user_helper, organism as organism_helper, data as data_helper
from jobs import local_samples_upload
import openpyxl
import itertools

def get_local_samples(args):
    return data_helper.get_items('local_samples', args)

def get_local_sample(id):
    sample = LocalSample.objects(local_id=id).first()
    if not sample:
        raise NotFound(description=f"Local Sample {id} not found!")
    return sample

def delete_local_sample(id):
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description="User not logged in")
    
    sample_to_delete = get_local_sample(id)
    
    if user.role.value == 'DataManager' and not sample_to_delete.taxid in user.species:
        raise Unauthorized(description="User can't delete this sample")
    
    taxid = sample_to_delete.taxid
    sample_to_delete.delete()
    organism = organism_helper.handle_organism(taxid)
    if organism:
        organism.save()
    return id


def parse_excel(excel=None, id=None, taxid=None, scientific_name=None, header=1, option="SKIP", source=None):
    
    param_errors = excel_helper.validate_params(excel, header, source)
    if param_errors:
        raise BadRequest(description=f"{'; '.join(param_errors) }")
    
    wb_obj = openpyxl.load_workbook(excel, data_only=True)
    sheet_obj = wb_obj.active

    header = int(header)

    header_row = excel_helper.get_header_row(sheet_obj, header)

    mandatory_fields = {'Local Id': id, 'taxid': taxid, 'Scientific name': scientific_name}

    errors = excel_helper.validate_and_check_options(header_row, mandatory_fields, option)
    if errors:
        raise BadRequest(description=f"{'; '.join(errors) }")
    
    rows_to_process = itertools.islice(sheet_obj.rows, header, None)

    rows_errors, samples = excel_helper.process_rows(rows_to_process, header_row, header, mandatory_fields)

    if rows_errors:
        return rows_errors, 400
    
    mapped_samples = excel_helper.map_samples_to_dict(samples, id, source, scientific_name, taxid)

    user = user_helper.get_current_user()

    if not user:
        raise NotFound(description=f"User {user} not found")

    taxids = list(set(str(s.get('taxid')) for s in mapped_samples))

    existing_taxids = list(Organism.objects(taxid__in=taxids).scalar('taxid'))
    if existing_taxids:
        taxonomy_errors = taxonomy_helper.check_species_permission(user, existing_taxids)
        if taxonomy_errors:
            raise BadRequest(description=f"Taxonomy permission errors: {' '.join(taxonomy_errors)}")
    
    task = local_samples_upload.upload_samples_spreadsheet.delay(user.name, mapped_samples, option, source)
    # create_or_update_organisms(new_taxons_to_parse, existing_organisms, user)
    return dict(id=task.id, state=task.state ), 200


