import os

from db.model import LocalSample
from db.enums import BrokerSource, Roles
from werkzeug.exceptions import NotFound, Unauthorized, BadRequest
from helpers import user as user_helper
from helpers.rest_catalog_sync import cascade_delete_local_sample
from jobs import local_samples_upload
from helpers.service_utils import get_or_404
from helpers.upload_temp import save_upload_to_temp

TMP_DIR = os.getenv("TMP_DIR", "/tmp")


def _validate_upload_params(excel, header, source):
    param_errors = []

    if not excel:
        param_errors.append("excel field is missing")

    sources = [s.value for s in BrokerSource]
    if not source:
        source = BrokerSource.LOCAL
    elif source not in sources:
        param_errors.append("'source field must be" + ", ".join(sources))
    try:
        header = int(header)
        if header < 1:
            param_errors.append("header must be greater than 1")
    except ValueError:
        param_errors.append("header must be an int number")
    return param_errors


def delete_local_sample(id):
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description="User not logged in")

    sample_to_delete = get_or_404(LocalSample, f"Local Sample {id} not found!", local_id=id)

    if user.role.value == Roles.DATA_MANAGER.value and sample_to_delete.taxid not in user.species:
        raise Unauthorized(description="User can't delete this sample")

    cascade_delete_local_sample(sample_to_delete)

    return id


def parse_excel(excel=None, id=None, taxid=None, scientific_name=None, header=1, option="SKIP", source=None):
    param_errors = _validate_upload_params(excel, header, source)
    if param_errors:
        raise BadRequest(description=f"{'; '.join(param_errors)}")

    if not excel:
        raise BadRequest(description="excel file is missing")

    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description="User not found")

    try:
        with save_upload_to_temp(
            excel, TMP_DIR, filename_prefix="local_samples_upload", suffix=".xlsx"
        ) as stored_path:
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
    except OSError as e:
        raise BadRequest(description=f"Could not store upload: {e}")

    return {
        "id": task.id,
        "state": task.state,
        "status_url": f"/api/tasks/{task.id}",
    }, 200
