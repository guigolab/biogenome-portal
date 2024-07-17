from db.models import BioSample

def parse_biosample_from_ebi_data(sample):
    taxid = str(sample.get('taxId'))
    accession = sample.get('accession')
    characteristics = sample.get('characteristics')
    name = characteristics.get('scientificName')
    if not name:
        name = characteristics.get('organism')
    scientific_name = name[0].get('text')
    biosample_to_save=dict(accession=accession,taxid=taxid,scientific_name=scientific_name,metadata={})
    extra_metadata = {k:characteristics[k] for k in characteristics if k not in ['taxId','scientificName','accession','organism']}
    for k in extra_metadata.keys():
        biosample_to_save['metadata'][k] = extra_metadata[k][0]['text']
    return BioSample(**biosample_to_save)

