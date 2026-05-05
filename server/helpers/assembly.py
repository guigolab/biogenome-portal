import asyncio
import csv
import logging
from typing import Any, List, Mapping, Optional, Union

import aiohttp

from clients import ncbi_assembly_http
from db.model import Chromosome

logger = logging.getLogger(__name__)

_ASSEMBLY_REPORT_ROLE_COL = "Sequence-Role"
_ASSEMBLY_REPORT_ACCN_COL_GENBANK = "GenBank-Accn"
_ASSEMBLY_REPORT_ACCN_COL_REFSEQ = "RefSeq-Accn"
_CHROMOSOME_ROLE = "assembled-molecule"

# NCBI datasets / assembly report fetch: only these levels have per-molecule rows worth persisting.
CHROMOSOME_REPORT_ASSEMBLY_LEVELS = frozenset({"Complete Genome", "Chromosome"})


def assembly_level_allows_chromosome_report(
    metadata_or_doc: Optional[Union[Mapping[str, Any], Any]],
) -> bool:
    """
    True if ``metadata.assembly_info.assembly_level`` is one of the levels for which we
    fetch and store ``assembled-molecule`` rows from the NCBI assembly report.
    Accepts a metadata dict or an object with a ``metadata`` attribute.
    """
    if metadata_or_doc is None:
        return False
    meta: Any
    if isinstance(metadata_or_doc, Mapping):
        meta = metadata_or_doc
    else:
        meta = getattr(metadata_or_doc, "metadata", None)
    if not isinstance(meta, Mapping):
        return False
    raw_info = meta.get("assembly_info")
    info: Any = raw_info if isinstance(raw_info, Mapping) else {}
    level = info.get("assembly_level")
    return level in CHROMOSOME_REPORT_ASSEMBLY_LEVELS

# NCBI assembly reports use these as missing-value placeholders in some columns (e.g. UCSC-style-name).
_NCBI_REPORT_NA_CELLS = frozenset(("", "na", "n/a", ".", "-"))


def is_ncbi_report_na_cell(value) -> bool:
    """True if the report cell should be treated as empty (do not persist literal 'na', etc.)."""
    if value is None:
        return True
    return str(value).strip().lower() in _NCBI_REPORT_NA_CELLS


def sanitize_ncbi_chromosome_metadata(metadata: dict, assembly_accession: str) -> dict:
    """
    Drop placeholder per-cell values from report-derived metadata. Does not drop whole
    sequence rows—only omits keys whose value is a known missing token.
    """
    out = {k: v for k, v in metadata.items() if not is_ncbi_report_na_cell(v)}
    out["assembly_accession"] = assembly_accession
    return out


async def stream_assembly_report_chromosomes(assembly_accession: str) -> List[Chromosome]:
    """
    Resolve the assembly report URL, stream the report from NCBI, parse it line-by-line,
    and return only the chromosomes (rows with Sequence-Role == assembled-molecule).
    The report is streamed and not loaded fully into memory.
    """
    result: List[Chromosome] = []
    is_refseq = assembly_accession.upper().startswith("GCF_")
    accn_col = _ASSEMBLY_REPORT_ACCN_COL_REFSEQ if is_refseq else _ASSEMBLY_REPORT_ACCN_COL_GENBANK
    async with aiohttp.ClientSession() as session:
        report_url = await ncbi_assembly_http.get_assembly_report_url(session, assembly_accession)
        if not report_url:
            return result
        line_iter = ncbi_assembly_http.stream_report_lines(session, report_url)
        header = None
        role_idx = accn_idx = 0
        async for line in line_iter:
            norm = ncbi_assembly_http.normalize_assembly_report_tsv_line(line)
            if norm is None:
                continue
            parts = next(csv.reader([norm], delimiter="\t"), [])
            if header is None:
                header = parts
                try:
                    role_idx = header.index(_ASSEMBLY_REPORT_ROLE_COL)
                    accn_idx = header.index(accn_col)
                    header = [k.lower().replace("-", "_") for k in header]
                except ValueError:
                    header = None
                    continue
                continue
            if len(parts) <= max(role_idx, accn_idx):
                continue
            if parts[role_idx] != _CHROMOSOME_ROLE:
                continue
            accn = parts[accn_idx].strip() if accn_idx < len(parts) else None
            if not accn:
                continue
            metadata = dict(zip(header, parts)) if header else {}
            metadata.pop(accn_col.lower().replace("-", "_"), None)
            metadata = sanitize_ncbi_chromosome_metadata(metadata, assembly_accession)
            result.append(Chromosome(accession_version=accn, metadata=metadata))
    return result


def stream_assembly_report_chromosomes_sync(assembly_accession: str) -> List[Chromosome]:
    """Synchronous wrapper. Use from Flask (sync) views."""
    return asyncio.run(stream_assembly_report_chromosomes(assembly_accession))


def save_chromosomes_from_assembly_report(assembly_obj) -> None:
    """
    Persist assembled-molecule rows from the NCBI assembly report (HTTP stream).

    Same source as the import jobs' chromosome path; skips non-chromosome assembly levels.
    """
    accession = assembly_obj.accession
    if not assembly_level_allows_chromosome_report(assembly_obj):
        return
    try:
        chromosomes = stream_assembly_report_chromosomes_sync(accession)
    except Exception:
        logger.exception("Assembly report chromosome fetch failed for %s", accession)
        return
    if not chromosomes:
        return
    versions = [c.accession_version for c in chromosomes if c.accession_version]
    if not versions:
        return
    existing = set(
        Chromosome.objects(accession_version__in=versions).scalar("accession_version")
    )
    to_insert = [
        c for c in chromosomes if c.accession_version and c.accession_version not in existing
    ]
    if to_insert:
        try:
            Chromosome.objects.insert(to_insert)
        except Exception:
            logger.exception("Chromosome insert failed for assembly %s", accession)
            return
    assembly_obj.chromosomes = versions
