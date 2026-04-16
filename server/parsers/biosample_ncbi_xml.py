"""
Parse NCBI Entrez BioSample XML into ``BioSample`` documents.

Expected XML structure (simplified):

  <BioSampleSet>
    <BioSample accession="SAMN03255769" ...>
      <Ids>
        <Id db="BioSample" is_primary="1">SAMN03255769</Id>
      </Ids>
      <Description>
        <Organism taxonomy_id="9606" taxonomy_name="Homo sapiens">
          <OrganismName>Homo sapiens</OrganismName>
        </Organism>
      </Description>
      <Attributes>
        <Attribute attribute_name="isolate" ...>CHM13</Attribute>
        ...
      </Attributes>
    </BioSample>
  </BioSampleSet>

Metadata is built by flattening ``Attributes/Attribute[@attribute_name]``
(``{attribute_name: text_content}`` for each element, matching the
attribute metadata convention used by other parsers in this codebase).
"""

from __future__ import annotations

import logging
from io import BytesIO
from typing import List, Optional

from lxml import etree

from db.model import BioSample

logger = logging.getLogger(__name__)


def _parse_biosample_element(elem) -> Optional[BioSample]:
    """Parse a single ``<BioSample>`` lxml element into a ``BioSample``."""
    accession = elem.get("accession")
    if not accession:
        # Try <Ids><Id db="BioSample" is_primary="1">...</Id></Ids>
        for id_elem in elem.findall(".//Ids/Id[@is_primary='1']"):
            text = (id_elem.text or "").strip()
            if text:
                accession = text
                break
    if not accession or not str(accession).strip():
        return None
    accession = str(accession).strip()

    # --- taxid / scientific_name from <Description><Organism> ---
    taxid: Optional[str] = None
    scientific_name: Optional[str] = None

    org_elem = elem.find(".//Description/Organism")
    if org_elem is not None:
        raw_taxid = org_elem.get("taxonomy_id")
        if raw_taxid:
            taxid = str(raw_taxid).strip() or None

        raw_name = org_elem.get("taxonomy_name")
        if raw_name:
            scientific_name = str(raw_name).strip() or None

        if not scientific_name:
            name_elem = org_elem.find("OrganismName")
            if name_elem is not None and name_elem.text:
                scientific_name = name_elem.text.strip() or None

    if not taxid or not scientific_name:
        return None

    # --- metadata: flatten Attributes ---
    metadata: dict = {}
    for attr in elem.findall(".//Attributes/Attribute"):
        name = attr.get("attribute_name") or attr.get("harmonized_name")
        value = (attr.text or "").strip()
        if name and value:
            metadata[name] = value

    return BioSample(
        accession=accession,
        taxid=taxid,
        scientific_name=scientific_name,
        metadata=metadata,
    )


def parse_biosamples_from_ncbi_xml(xml_text: str) -> List[BioSample]:
    """
    Parse a ``<BioSampleSet>`` XML string (as returned by NCBI Entrez efetch)
    into a list of ``BioSample`` instances.

    Skips individual elements that cannot be parsed without aborting the batch.
    Returns an empty list when the input is unparseable.
    """
    if not xml_text or not xml_text.strip():
        return []

    try:
        root = etree.fromstring(xml_text.encode("utf-8"))
    except etree.XMLSyntaxError:
        logger.warning("parse_biosamples_from_ncbi_xml: failed to parse XML (syntax error)")
        return []

    results: List[BioSample] = []
    for bio_elem in root.findall("BioSample"):
        try:
            doc = _parse_biosample_element(bio_elem)
            if doc is not None:
                results.append(doc)
        except Exception:
            logger.exception(
                "parse_biosamples_from_ncbi_xml: error parsing BioSample element (accession=%r)",
                bio_elem.get("accession"),
            )
    return results
