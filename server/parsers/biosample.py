from db.models import BioSample

def parse_biosample_from_ebi_data(sample):
    taxid = str(sample.get('taxId'))
    accession = sample.get('accession')
    characteristics = sample.get('characteristics')
    name = characteristics.get('scientificName')
    if not name:
        # Fallback: case-insensitive lookup for 'organism'
        name = characteristics.get('organism') or characteristics.get('Organism')
    
    if not name or not isinstance(name, list) or 'text' not in name[0]:
        raise ValueError(f"Cannot extract scientific name from sample: {sample}")

    scientific_name = name[0].get('text')
    biosample_to_save=dict(accession=accession,taxid=taxid,scientific_name=scientific_name,metadata={})
    extra_metadata = {k:characteristics[k] for k in characteristics if k not in ['taxId','scientificName','accession','organism','Organism']}
    for k in extra_metadata.keys():
        biosample_to_save['metadata'][k] = extra_metadata[k][0]['text']
    return BioSample(**biosample_to_save)

