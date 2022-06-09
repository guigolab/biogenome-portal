from db.models import BioSample
from utils import ena_client,utils

def get_or_create_biosample(accession,organism,assembly):
    sample_obj = BioSample.objects(accession=accession).first()
    ##parse sample
    if not sample_obj:
        required_metadata=dict(accession=accession,taxid=organism.taxid,scientific_name=organism.scientific_name)
        metadata = handle_biosample(assembly,accession)
        sample_obj = BioSample(metadata=metadata, **required_metadata).save()  
    organism.modify(add_to_set__biosamples=sample_obj.accession)
    return sample_obj

def handle_biosample(assembly, sample_accession):
    extra_metadata=dict()
    if not 'biosample' in assembly.keys() or not 'attributes' in assembly['biosample'].keys():
        #retrieve sample metadata from EBI/BioSamples
        resp = ena_client.get_sample_from_biosamples(sample_accession)
        extra_metadata = resp['_embedded']['samples'][0]['characteristics'] if '_embedded' in resp.keys() else dict()
    else:
        biosample_metadata = assembly['biosample']
        for attr in biosample_metadata['attributes']:
            extra_metadata[attr['name']] = [dict(text=attr['value'])]
    return utils.parse_sample_metadata(extra_metadata)
