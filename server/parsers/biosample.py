from db.models import BioSample
from lxml import etree

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

def parse_biosample_from_ncbi_datasets(biosample, taxid, scientific_name):
    biosample_to_parse = {
        'scientific_name': scientific_name,
        'taxid': taxid,
        'accession': biosample.get('accession'),
        'metadata': {attr.get('name'): attr.get('value') for attr in biosample.get('attributes', [])}
    }
    return BioSample(**biosample_to_parse)

def parse_samples_from_ena_browser(xml_content):
    # Parse the XML content
    tree = etree.fromstring(xml_content)

    parsed_samples = []
    # Iterate over each SAMPLE in the SAMPLE_SET
    for sample in tree.findall('.//SAMPLE'):
        sample_name = sample.find('SAMPLE_NAME')
        sample_to_parse = {
            'accession':sample.get('accession'),
            'metadata': {k:v for k,v in sample.attrib.items() if k != 'accession'},
            'scientific_name': sample_name.find('SCIENTIFIC_NAME').text,
            'taxid': str(sample_name.find('TAXON_ID').text)
            }
        
        # Find the SAMPLE_ATTRIBUTES section
        sample_attributes_section = sample.find('SAMPLE_ATTRIBUTES')

        # Check if SAMPLE_ATTRIBUTES section exists
        if sample_attributes_section is not None:
            # Iterate over each SAMPLE_ATTRIBUTE
            for sample_attribute in sample_attributes_section.findall('SAMPLE_ATTRIBUTE'):
                tag = sample_attribute.find('TAG').text
                value = sample_attribute.find('VALUE').text
                sample_to_parse['metadata'][tag] = value

        # Add the sample's attributes to the main dictionary
        parsed_samples.append(BioSample(**sample_to_parse))
    return parsed_samples