

def parse_biosample_from_ebi_data(sample):
    taxid = str(sample.get('taxId'))
    accession = sample.get('accession')
    scientific_name = sample.get('characteristics').get('scientific_name')[0].get('text')
    required_metadata=dict(accession=accession,taxid=taxid,scientific_name=scientific_name)
    extra_metadata = parse_sample_metadata({k:sample['characteristics'][k] for k in sample['characteristics'].keys() if k not in ['taxId','scientificName','accession','organism']})
    return dict(metadata=extra_metadata,**required_metadata)

def parse_biosample_from_ncbi_datasets(biosample):
    taxid = ass.get('org').get('tax_id')
    scientific_name = ncbi_response.get('org').get('sci_name')
    accession = ncbi_response.get('biosample').get('accession')
    required_metadata=dict(accession=accession,taxid=taxid,scientific_name=scientific_name)
    biosample_metadata = dict()
    ##format to biosample response model
    for attr in ncbi_response['biosample']['attributes']:
        biosample_metadata[attr['name']] = [dict(text=attr['value'])] 
    extra_metadata = parse_sample_metadata(biosample_metadata)
    return dict(metadata=extra_metadata,**required_metadata)


def parse_sample_metadata(metadata):
    sample_metadata = dict()
    for k in metadata.keys():
        sample_metadata[k] = metadata[k][0]['text']
    return sample_metadata