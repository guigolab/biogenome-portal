from db.models import BioSample

def parse_biosample_from_ebi_data(sample):
    taxid = str(sample.get('taxId'))
    accession = sample.get('accession')
    scientific_name = sample.get('characteristics').get('scientific_name')[0].get('text')
    biosample_to_save=dict(accession=accession,taxid=taxid,scientific_name=scientific_name,metadata={})
    extra_metadata = {k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession','organism']}
    for k in extra_metadata.keys():
        biosample_to_save['metadata'][k] = extra_metadata[k][0]['text']
    return BioSample(**biosample_to_save)

def parse_biosample_from_ncbi_datasets(biosample, taxid, scientific_name):
    biosample_to_parse = {
        'scientific_name': scientific_name,
        'taxid': taxid,
        'accession': biosample.get('accession'),
        'metadata': {attr.get('name'): attr.get('value') for attr in biosample.get('attributes', [])}
    }
    return BioSample(**biosample_to_parse)
