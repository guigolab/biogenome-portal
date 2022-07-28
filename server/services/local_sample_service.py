from db.models import LocalSample
from errors import NotFound
from services import organism_service


def delete_local_sample(id):
    sample_to_delete = LocalSample.objects(local_id=id).first()
    if not sample_to_delete:
        raise NotFound
    organism_to_update = organism_service.get_or_create_organism(sample_to_delete.taxid)
    if organism_to_update:
        organism_to_update.modify(pull__local_samples=id)
        organism_to_update.save()
    sample_to_delete.delete()
    return id
