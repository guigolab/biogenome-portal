from services import sample_service,organisms_service
from flask import current_app as app
from errors import TaxonNotFoundError


# create sample and related data and return sample object
# we ensure that taxid is present before this method is called
def create_sample(data):
    taxid = str(data['taxid'])
    if 'common_name' in data.keys():
        organism = organisms_service.get_or_create_organism(taxid, data['common_name'])
    else:
        organism = organisms_service.get_or_create_organism(taxid)
    if not organism:
        raise TaxonNotFoundError
    sample = sample_service.create_sample_object(data).save()
    #behind the scenes it creates the taxonomic hierarchy
    #manage records locally(no experiments and assemblies)
    organism.modify(push__records=sample)
    return sample
    
def import_samples(samples):
    saved_objects=list()
    for sample in samples:
        sample_obj = create_sample(sample)
        if sample_obj:
            saved_objects.append(sample_obj)
    return saved_objects

