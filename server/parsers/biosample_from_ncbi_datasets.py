"""
Parse a BioSample document from a raw NCBI datasets assembly dict.

NCBI datasets assembly JSONL embeds full biosample metadata under
``assembly_info.biosample``.  This parser extracts accession, taxid,
scientific_name, and a flat ``metadata`` dict from the ``attributes``
list without any network call.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from db.model import BioSample


def parse_biosample_from_assembly_dict(assembly: Dict[str, Any]) -> Optional[BioSample]:
    """
    Build a ``BioSample`` from the embedded biosample block inside a raw NCBI
    datasets assembly dict.

    Returns ``None`` when the required fields (accession, taxid,
    scientific_name) cannot be determined.

    Taxid / scientific_name resolution order:
      1. ``assembly.organism.tax_id`` / ``organism_name``  (most reliable)
      2. ``biosample.description.organism.tax_id`` / ``organism_name``

    Metadata is built by flattening ``biosample.attributes[].{name, value}``
    (``{name: value}`` for each entry).  Attribute values win over any
    identically-named top-level scalar biosample fields; the caller may add
    further keys after the fact if needed.
    """
    info = assembly.get("assembly_info") or {}
    bio = info.get("biosample") or {}
    if not isinstance(bio, dict):
        return None

    accession = bio.get("accession")
    if not accession or not str(accession).strip():
        return None
    accession = str(accession).strip()

    # --- taxid / scientific_name ---
    organism = assembly.get("organism") or {}
    taxid: Optional[str] = None
    scientific_name: Optional[str] = None

    raw_taxid = organism.get("tax_id")
    if raw_taxid is not None:
        taxid = str(raw_taxid).strip() or None

    raw_name = organism.get("organism_name")
    if raw_name:
        scientific_name = str(raw_name).strip() or None

    # Fallback to nested description.organism
    if not taxid or not scientific_name:
        desc_org = (bio.get("description") or {}).get("organism") or {}
        if not taxid:
            raw_taxid = desc_org.get("tax_id")
            if raw_taxid is not None:
                taxid = str(raw_taxid).strip() or None
        if not scientific_name:
            raw_name = desc_org.get("organism_name")
            if raw_name:
                scientific_name = str(raw_name).strip() or None

    if not taxid or not scientific_name:
        return None

    # --- metadata: flatten attributes[]{name, value} ---
    metadata: Dict[str, str] = {}
    for attr in bio.get("attributes") or []:
        if not isinstance(attr, dict):
            continue
        name = attr.get("name")
        value = attr.get("value")
        if name and value is not None:
            metadata[str(name)] = str(value)

    return BioSample(
        accession=accession,
        taxid=taxid,
        scientific_name=scientific_name,
        metadata=metadata,
    )


def _sample_accession_from_row(assembly: Dict[str, Any]) -> str:
    """Extract the biosample accession from an assembly dict (no DB access)."""
    info = assembly.get("assembly_info") or {}
    bio = info.get("biosample") or {}
    if not isinstance(bio, dict):
        return ""
    acc = bio.get("accession")
    return str(acc).strip() if acc else ""


def build_assembly_row_by_biosample(
    new_rows: list,
    assemblies_to_update: Dict[str, Any],
) -> Dict[str, Dict[str, Any]]:
    """
    Build a mapping ``{biosample_accession: assembly_row}`` from the two
    collections returned by ``merge_assembly_jsonl_rows_from_paths``.

    First-row wins when multiple assembly rows share the same biosample
    accession (uncommon but possible for multi-project assemblies).
    """
    result: Dict[str, Dict[str, Any]] = {}
    for row in list(new_rows) + list(assemblies_to_update.values()):
        acc = _sample_accession_from_row(row)
        if acc and acc not in result:
            result[acc] = row
    return result
