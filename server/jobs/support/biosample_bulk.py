import gzip
import logging
import os

from lxml import etree
from lxml.etree import XMLSyntaxError
from clients import ebi_client
from helpers.data import create_batches
from parsers import biosample
from uuid import uuid4

logger = logging.getLogger(__name__)


def parse_biosamples_from_xml(xml_path):
    """
    Memory-efficient streaming parser for ENA biosample XML files (plain or gzipped).
    Assumes valid ENA structure: <SAMPLE_SET><SAMPLE>...</SAMPLE> ... </SAMPLE_SET>
    Only top-level <SAMPLE> nodes are parsed. Each is converted to a BioSample using
    the same logic as parse_biosample_from_ebi_data (accession, taxid, scientific_name, metadata).
    Returns a list of BioSample instances (not saved to DB).
    """
    try:
        open_fn = gzip.open if xml_path.endswith(".gz") else open
        with open_fn(xml_path, "rb") as f:
            context = etree.iterparse(f, events=("end",))
            biosamples = []
            for _, elem in context:
                if elem.tag != "SAMPLE":
                    continue
                parent = elem.getparent()
                if parent is None or parent.tag != "SAMPLE_SET":
                    continue

                try:
                    biosample_obj = biosample.parse_biosample_from_ena_xml_element(elem)
                    biosamples.append(biosample_obj)
                except (ValueError, TypeError):
                    # Skip samples that cannot be parsed (e.g. missing scientific name)
                    pass

                elem.clear()
                while elem.getprevious() is not None:
                    del elem.getparent()[0]

            return biosamples
    except (XMLSyntaxError, OSError) as e:
        logger.warning(
            "ENA biosample XML unreadable or empty (%s): %s",
            xml_path,
            e,
        )
        return []
    except Exception as e:
        logger.warning(
            "Unexpected error parsing ENA biosample XML (%s): %s",
            xml_path,
            e,
        )
        return []


def fetch_new_biosamples_from_ebi_portal(accessions, tmp_dir):
    """
    Function to fetch new biosamples from ENA portal in bulk (up to 10k accessions at a time) and parse them
    WARNING: only works for biosamples with data available in ENA portal (not all biosamples are available)
    Returns a list of parsed BioSample objects
    """
    batches = create_batches(accessions, 5000)
    biosamples = []
    for batch in batches:
        path_to_gzipped_xml_file = None
        try:
            path_to_gzipped_xml_file = os.path.join(tmp_dir, f"biosamples_{uuid4()}.xml.gz")
            fetch_success = ebi_client.get_xml_from_ena_browser(batch, path_to_gzipped_xml_file)
            if (
                not fetch_success
                or not os.path.exists(path_to_gzipped_xml_file)
                or os.path.getsize(path_to_gzipped_xml_file) < 20
            ):
                continue
            biosamples.extend(parse_biosamples_from_xml(path_to_gzipped_xml_file))
        except Exception as e:
            logger.exception("Error fetching biosamples from ENA portal: %s", e)
            continue
        finally:
            if path_to_gzipped_xml_file and os.path.exists(path_to_gzipped_xml_file):
                try:
                    os.remove(path_to_gzipped_xml_file)
                except OSError:
                    pass
    return biosamples
