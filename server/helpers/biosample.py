from db.models import BioSample
from clients import ebi_client
from helpers.taxon_organism_sync import sync_many_taxids
from parsers import biosample
from helpers import geolocation, data as data_helper, organism as organism_helper
from lxml import etree
import gzip
import os

def handle_biosample(accession):
    biosample_obj = BioSample.objects(accession=accession).first()
    if biosample_obj:
        return biosample_obj

    biosample_obj = create_biosample_from_accession(accession)

    if biosample_obj:
        organism = organism_helper.handle_organism(biosample_obj.taxid)
        if organism:
            data_helper.update_lineage(biosample_obj, organism, skip_sync=True)
            
    return biosample_obj

def create_biosample_from_accession(accession):
    biosample_response = ebi_client.get_sample_from_biosamples(accession)
    if not biosample_response:
        return None

    biosample_obj = biosample.parse_biosample_from_ebi_data(biosample_response)
    
    biosample_obj.save()

    handle_biosample_location_data(biosample_obj)
    handle_derived_samples(biosample_obj.accession)
    
    return biosample_obj


def handle_biosample_location_data(biosample_obj):
    geolocation.save_coordinates(biosample_obj)
    geolocation.update_countries_from_biosample(biosample_obj, biosample_obj.accession)


def handle_derived_samples(accession):
    ebi_biosample_response = ebi_client.get_samples_derived_from(accession)
    biosample_siblings = [biosample.parse_biosample_from_ebi_data(sample) for sample in ebi_biosample_response]
    existing_siblings = BioSample.objects(accession__in=[b.accession for b in biosample_siblings]).scalar('accession')
    
    for sibling in biosample_siblings:
        if sibling.accession not in existing_siblings:
            handle_biosample_location_data(sibling)
            sibling.save()    
    


def parse_biosamples_from_xml(xml_path):
    """
    Memory-efficient streaming parser for ENA biosample XML files (plain or gzipped).
    Assumes valid ENA structure: <SAMPLE_SET><SAMPLE>...</SAMPLE> ... </SAMPLE_SET>
    Only top-level <SAMPLE> nodes are parsed. Each is converted to a BioSample using
    the same logic as parse_biosample_from_ebi_data (accession, taxid, scientific_name, metadata).
    Returns a list of BioSample instances (not saved to DB).
    """
    biosamples = []
    open_fn = gzip.open if xml_path.endswith(".gz") else open
    with open_fn(xml_path, "rb") as f:
        context = etree.iterparse(f, events=("end",))
        for _, elem in context:
            if elem.tag != "SAMPLE":
                continue
            parent = elem.getparent()
            if parent is None or parent.tag != "SAMPLE_SET":
                continue

            try:
                biosample_obj = biosample.parse_biosample_from_ena_xml_element(elem)
                biosamples.append(biosample_obj)
            except (ValueError, TypeError) as e:
                # Skip samples that cannot be parsed (e.g. missing scientific name)
                pass

            elem.clear()
            while elem.getprevious() is not None:
                del elem.getparent()[0]

    return biosamples


def fetch_new_biosamples_from_ebi_portal(accessions, tmp_dir):
    """
    Function to fetch new biosamples from ENA portal in bulk (up to 10k accessions at a time) and parse them
    WARNING: only works for biosamples with data available in ENA portal (not all biosamples are available)
    Returns a list of parsed BioSample objects
    """
    batches = data_helper.create_batches(accessions, 5000)
    biosamples = []
    for batch in batches:
        path_to_gzipped_xml_file = os.path.join(tmp_dir, f'biosamples_{len(batch)}.xml.gz')
        fetch_success = ebi_client.get_xml_from_ena_browser(batch, path_to_gzipped_xml_file)
        if not fetch_success or not os.path.exists(path_to_gzipped_xml_file) or os.path.getsize(path_to_gzipped_xml_file) == 0:
            continue
        biosamples.extend(parse_biosamples_from_xml(path_to_gzipped_xml_file))
        # Best-effort cleanup to save disk space
        try:
            os.remove(path_to_gzipped_xml_file)
        except Exception:
            pass
    return biosamples


def handle_biosamples_from_accessions(accessions, tmp_dir):

    """
    IMPORTANT: Use this only to handle biosamples linked to assemblies or reads
    Returns the list of saved biosample accessions
    """
    batches = data_helper.create_batches(accessions, 5000)
    saved_accessions = []
    for batch in batches:
        existing_accessions = BioSample.objects(accession__in=batch).scalar('accession')
        new_accessions = [accession for accession in batch if accession not in existing_accessions]
        if new_accessions:
            biosamples = fetch_new_biosamples_from_ebi_portal(new_accessions, tmp_dir)
            BioSample.objects.insert(biosamples)
            sync_many_taxids(b.taxid for b in biosamples)
            saved_accessions.extend(new_accessions)
    return saved_accessions
