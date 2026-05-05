from typing import Any, Optional

from db.model import Organism, ReadRun

# Placeholder until BioSample resolution fills a real NCBI taxid (not a valid taxid string).
READRUN_TAXID_PENDING = "__pending_biosample__"


def readrun_taxid_is_pending(taxid: Any) -> bool:
    """True when ``taxid`` is the pre–biosample sentinel from :func:`parse_read_from_ena_portal`."""
    return str(taxid).strip() == READRUN_TAXID_PENDING


def scientific_name_is_placeholder(name: Optional[str]) -> bool:
    """True when ENA omitted the name or we substituted the parser default."""
    s = (name or "").strip()
    return not s or s.lower() == "unknown"


def backfill_readrun_scientific_name_from_organism(
    read_run: ReadRun, organism: Optional[Organism]
) -> None:
    """If ``read_run`` has no real species label, copy ``Organism.scientific_name``."""
    if not scientific_name_is_placeholder(getattr(read_run, "scientific_name", None)):
        return
    if organism is None:
        return
    sn = (getattr(organism, "scientific_name", None) or "").strip()
    if not sn:
        return
    read_run.scientific_name = sn


def parse_read_from_ena_portal(run):

    run_accession = run.get('run_accession')
    experiment_accession = run.get('experiment_accession')
    primary_sample = (run.get("sample_accession") or "").strip()
    secondary_sample = (run.get("secondary_sample_accession") or "").strip()
    if primary_sample:
        sample_accession = primary_sample
    elif secondary_sample:
        sample_accession = secondary_sample
    else:
        sample_accession = None
    scientific_name = run.get('scientific_name')
    raw_tax = run.get("tax_id")
    if raw_tax is None or not str(raw_tax).strip():
        taxid = READRUN_TAXID_PENDING
    else:
        taxid = str(raw_tax).strip()
    # ReadRun requires scientific_name; ENA may omit it on some rows
    name = (scientific_name or '').strip() or 'unknown'

    metadata = {k: v for k, v in run.items() if v}
    if not primary_sample and secondary_sample:
        metadata["ena_sample_accession_source"] = "secondary_sample_accession"

    read_to_parse = {
        'run_accession': run_accession,
        'taxid': taxid,
        'experiment_accession': experiment_accession,
        'scientific_name': name,
        'sample_accession': sample_accession,
        'metadata': metadata
    }
    read_to_save = ReadRun(**read_to_parse)
    return read_to_save