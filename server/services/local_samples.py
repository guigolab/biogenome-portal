from db.model import LocalSample
from db.enums import Roles
from werkzeug.exceptions import NotFound, Unauthorized
from helpers import user as user_helper
from helpers.rest_catalog_sync import cascade_delete_local_sample
from helpers.service_utils import get_or_404


def delete_local_sample(id):
    user = user_helper.get_current_user()
    if not user:
        raise NotFound(description="User not logged in")

    sample_to_delete = get_or_404(LocalSample, f"Local Sample {id} not found!", local_id=id)

    if user.role.value == Roles.DATA_MANAGER.value and sample_to_delete.taxid not in user.species:
        raise Unauthorized(description="User can't delete this sample")

    cascade_delete_local_sample(sample_to_delete)

    return id
