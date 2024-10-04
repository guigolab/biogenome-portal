from db.models import LocalSample
from werkzeug.exceptions import NotFound,Unauthorized
from helpers import user as user_helper, organism as organism_helper, data as data_helper

FIELDS_TO_EXCLUDE = ['id']

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


