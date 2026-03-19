import os
import uuid

from db.models import LocalSample, Organism
from db.enums import Roles
from werkzeug.exceptions import NotFound, Unauthorized, BadRequest
from helpers import (
    local_sample as excel_helper,
    taxonomy as taxonomy_helper,
    user as user_helper,
)
from helpers.goat_report import safe_unlink
from helpers.local_samples_upload import load_mapped_samples_from_xlsx_path
from jobs import local_samples_upload
from rest.common.service_utils import get_or_404

TMP_DIR = os.getenv("TMP_DIR", "/tmp")


def get_local_sample(id):
    return get_or_404(LocalSample, f"Local Sample {id} not found!", local_id=id)

def delete_local_sample(id):
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description="User not logged in")
    
    sample_to_delete = get_local_sample(id)
    
    if user.role.value == Roles.DATA_MANAGER.value and not sample_to_delete.taxid in user.species:
        raise Unauthorized(description="User can't delete this sample")
    
    sample_to_delete.delete()
    # post_delete syncs organism status + taxon counts

    return id


def parse_excel(excel=None, id=None, taxid=None, scientific_name=None, header=1, option="SKIP", source=None):
    param_errors = excel_helper.validate_params(excel, header, source)
    if param_errors:
        raise BadRequest(description=f"{'; '.join(param_errors)}")

    if not excel:
        raise BadRequest(description="excel file is missing")

    os.makedirs(TMP_DIR, exist_ok=True)
    stored_path = os.path.join(TMP_DIR, f"local_samples_upload_{uuid.uuid4().hex}.xlsx")

    try:
        excel.save(stored_path)
    except OSError as e:
        raise BadRequest(description=f"Could not store upload: {e}")

    try:
        mapped_samples, parse_errors = load_mapped_samples_from_xlsx_path(
            stored_path, header, id, taxid, scientific_name, option, source
        )
    except Exception as e:
        safe_unlink(stored_path)
        raise BadRequest(description=f"Unexpected error reading spreadsheet: {e}")

    if parse_errors:
        safe_unlink(stored_path)
        return parse_errors, 400

    user = user_helper.get_current_user()
    if not user:
        safe_unlink(stored_path)
        raise NotFound(description="User not found")

    taxids = list(set(str(s.get("taxid")) for s in mapped_samples))

    existing_taxids = list(Organism.objects(taxid__in=taxids).scalar("taxid"))
    if existing_taxids:
        taxonomy_errors = taxonomy_helper.check_species_permission(user, existing_taxids)
        if taxonomy_errors:
            safe_unlink(stored_path)
            raise BadRequest(
                description=f"Taxonomy permission errors: {' '.join(taxonomy_errors)}"
            )

    try:
        task = local_samples_upload.upload_samples_spreadsheet.delay(
            user.name,
            stored_path,
            option,
            source,
            int(header),
            id,
            taxid,
            scientific_name,
        )
    except Exception:
        safe_unlink(stored_path)
        raise

    return dict(id=task.id, state=task.state), 200


# def download_template():
#     if not os.path.exists(TEMPLATE_PATH):
#         raise NotFound(description="No template found")
#     return excel_helper.generate_tsv_template(TEMPLATE_PATH)
    
# def generate_tsv_reader(report):
#     try:
#         decoded_report = report.read().decode('utf-8')
#         io_report = StringIO(decoded_report)
#         return csv.DictReader(io_report, delimiter='\t')

#     except UnicodeDecodeError as e:
#         raise BadRequest(description=f"File decoding error: {e}")
#     except Exception as e:
#         raise BadRequest(description=f"Unexpected error: {e}")
    

# def upload_template(request_files):
#     if not os.path.exists(TEMPLATE_PATH):
#         raise NotFound(description="No template found")
    
#     tsv_report = request_files.get('samples_report')
#     if not tsv_report:
#         raise BadRequest(description="Invalid 'samples_report' provided")

#     file = generate_tsv_reader(tsv_report)
#     excel_helper.validate_tsv_against_xml(TEMPLATE_PATH, file)
#     #validate template

#     #upload fields