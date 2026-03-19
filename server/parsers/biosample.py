from db.models import BioSample
from lxml import etree


def _sample_element_to_ebi_dict(elem):
    """
    Build the dict shape expected by parse_biosample_from_ebi_data from an ENA XML <SAMPLE> element.
    """
    accession = elem.get("accession")
    sample_name = elem.find("SAMPLE_NAME")
    taxid = None
    scientific_name = None
    if sample_name is not None:
        taxon_id_elem = sample_name.find("TAXON_ID")
        scientific_name_elem = sample_name.find("SCIENTIFIC_NAME")
        if taxon_id_elem is not None and taxon_id_elem.text:
            taxid = taxon_id_elem.text.strip()
        if scientific_name_elem is not None and scientific_name_elem.text:
            scientific_name = (scientific_name_elem.text or "").strip()

    characteristics = {}
    if scientific_name:
        characteristics["scientificName"] = [{"text": scientific_name}]

    sample_attrs = elem.find("SAMPLE_ATTRIBUTES")
    if sample_attrs is not None:
        for attr in sample_attrs.findall("SAMPLE_ATTRIBUTE"):
            tag_elem = attr.find("TAG")
            value_elem = attr.find("VALUE")
            if tag_elem is not None and value_elem is not None and tag_elem.text:
                tag = tag_elem.text.strip()
                value = (value_elem.text or "").strip()
                characteristics[tag] = [{"text": value}]

    return {
        "accession": accession,
        "taxId": taxid,
        "characteristics": characteristics,
    }


def parse_biosample_from_ena_xml_element(elem):
    """
    Parse a single ENA XML <SAMPLE> element (lxml) into a BioSample using the same
    semantics as parse_biosample_from_ebi_data.
    """
    sample_dict = _sample_element_to_ebi_dict(elem)
    return parse_biosample_from_ebi_data(sample_dict)


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

