from db.models import SecondaryOrganism, Organism
from utils import ena_client, utils
from services import taxon_service,sample_service,organisms_service,parser_service
from flask import Response
from flask import current_app as app
from errors import TaxonNotFoundError


# create sample and related data and return sample object
# we ensure that taxid is present before this method is called
def create_sample(data, localSource=False):
    metadata = data['metadata']
    common_names = data['commonNames']  if 'commonNames' in data.keys() else list()
    taxid = str(metadata['taxid'])
    organism = organisms_service.get_or_create_organism(taxid, common_names)
    if not organism:
        raise TaxonNotFoundError
    sample = sample_service.create_sample_object(metadata)
    #behind the scenes it creates the taxonomic hierarchy
    #manage records locally(no experiments and assemblies)
    sample.save()
    organism.records.append(sample)
    organism.save()
    return sample
    
def import_samples(samples):
    saved_objects=list()
    for sample in samples:
        sample_obj = create_sample({'metadata':sample})
        if sample_obj:
            saved_objects.append(sample_obj)
    return saved_objects

