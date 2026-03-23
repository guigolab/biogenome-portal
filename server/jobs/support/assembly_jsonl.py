"""
NCBI datasets JSONL assembly import helpers, bulk chromosome fetch from assembly reports,
and BlobToolKit id resolution (Celery assembly jobs only).

Chromosome persistence is job-only; REST uses ``helpers.assembly.save_chromosomes_from_assembly_report``.
"""

from __future__ import annotations

import asyncio
import csv
import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import aiohttp
from mongoengine.errors import NotUniqueError, ValidationError
from pymongo import UpdateOne

from clients import ncbi_assembly_http
from clients.genomehubs_client import fetch_blobtoolkit_first_name
from db.model import Assembly, Chromosome
from helpers.assembly import sanitize_ncbi_chromosome_metadata
from helpers.data import create_batches
from parsers.assembly import parse_assembly_from_ncbi_datasets

logger = logging.getLogger(__name__)

# --- Chromosome bulk (NCBI assembly reports) ---------------------------------

_ASSEMBLY_REPORT_ROLE_COL = "Sequence-Role"
_ASSEMBLY_REPORT_ACCN_COL_GENBANK = "GenBank-Accn"
_ASSEMBLY_REPORT_ACCN_COL_REFSEQ = "RefSeq-Accn"
_CHROMOSOME_ROLE = "assembled-molecule"


async def _fetch_chromosomes_from_report_url(
    session: aiohttp.ClientSession, assembly_accession: str, report_url: str
) -> List[Chromosome]:
    """
    Stream assembly report from URL, parse chromosomes (assembled-molecule rows),
    set metadata.assembly_accession on each, and return the list.
    """
    chromosomes: List[Chromosome] = []
    is_refseq = assembly_accession.upper().startswith("GCF_")
    accn_col = _ASSEMBLY_REPORT_ACCN_COL_REFSEQ if is_refseq else _ASSEMBLY_REPORT_ACCN_COL_GENBANK
    header = None
    role_idx = accn_idx = 0
    async for line in ncbi_assembly_http.stream_report_lines(session, report_url):
        norm = ncbi_assembly_http.normalize_assembly_report_tsv_line(line)
        if norm is None:
            continue
        parts = next(csv.reader([norm], delimiter="\t"), [])
        if header is None:
            header = parts
            try:
                role_idx = header.index(_ASSEMBLY_REPORT_ROLE_COL)
                accn_idx = header.index(accn_col)
            except ValueError:
                # e.g. Assembly-Units table; keep scanning for the sequence table header
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
        metadata.pop(accn_col, None)
        metadata = sanitize_ncbi_chromosome_metadata(metadata, assembly_accession)
        chromosomes.append(Chromosome(accession_version=accn, metadata=metadata))
    return chromosomes


async def fetch_chromosomes_for_assemblies_bulk(
    accessions: List[str], batch_size: int = 50
) -> Dict[str, List[Chromosome]]:
    """
    Resolve assembly report URLs for all accessions, then fetch and parse reports
    concurrently. Returns a dict mapping assembly accession to list of Chromosome instances.
    """
    if not accessions:
        return {}
    url_pairs = await ncbi_assembly_http.get_assembly_report_urls(accessions, batch_size=batch_size)
    if not url_pairs:
        return {}
    connector = aiohttp.TCPConnector(
        limit=min(len(url_pairs), ncbi_assembly_http.NCBI_CONCURRENT_CONNECTIONS),
        limit_per_host=ncbi_assembly_http.NCBI_CONCURRENT_CONNECTIONS,
    )
    result: Dict[str, List[Chromosome]] = {}
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            _fetch_chromosomes_from_report_url(session, acc, url)
            for acc, url in url_pairs
        ]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        for (acc, _), value in zip(url_pairs, batch_results):
            if isinstance(value, Exception):
                logger.warning(
                    "Assembly report fetch failed for %s: %s", acc, value
                )
                continue
            result[acc] = value
    return result


def fetch_chromosomes_for_assemblies_bulk_sync(
    accessions: List[str], batch_size: int = 50
) -> Dict[str, List[Chromosome]]:
    """Synchronous wrapper for fetch_chromosomes_for_assemblies_bulk."""
    return asyncio.run(fetch_chromosomes_for_assemblies_bulk(accessions, batch_size=batch_size))


def save_chromosomes_bulk_and_update_assemblies(accessions: List[str]) -> None:
    """
    Fetch chromosomes from NCBI assembly reports in bulk for the given assembly accessions,
    save chromosome documents, and update each assembly's chromosomes list.

    Skips assemblies with no parsed ``assembled-molecule`` rows so we do not delete
    existing chromosome documents on an empty or ambiguous fetch result.
    """
    if not accessions:
        return
    chroms_by_assembly = fetch_chromosomes_for_assemblies_bulk_sync(accessions)
    all_versions: set[str] = set()
    for chroms in chroms_by_assembly.values():
        for c in chroms:
            if c.accession_version:
                all_versions.add(c.accession_version)
    existing_versions: set[str] = set()
    if all_versions:
        existing_versions = set(
            Chromosome.objects(accession_version__in=list(all_versions)).scalar(
                "accession_version"
            )
        )
    for acc, chroms in chroms_by_assembly.items():
        if not chroms:
            logger.warning(
                "No assembled-molecule rows for assembly %s; leaving stored chromosomes unchanged",
                acc,
            )
            continue
        try:
            Chromosome.objects(metadata__assembly_accession=acc).delete()
            seen_v = set(existing_versions)
            to_insert: List[Chromosome] = []
            for c in chroms:
                v = c.accession_version
                if not v or v in seen_v:
                    continue
                seen_v.add(v)
                to_insert.append(c)
            if to_insert:
                Chromosome.objects.insert(to_insert)
                for c in to_insert:
                    if c.accession_version:
                        existing_versions.add(c.accession_version)
            chromosome_list = [c.accession_version for c in chroms if c.accession_version]
            Assembly.objects(accession=acc).update(chromosomes=chromosome_list)
        except Exception:
            logger.exception(
                "Failed to persist chromosomes for assembly %s; DB may be inconsistent for this accession",
                acc,
            )


# --- JSONL merge / persist ----------------------------------------------------


def _parse_assembly_document(raw: Dict[str, Any]) -> Optional[Assembly]:
    try:
        return parse_assembly_from_ncbi_datasets(raw)
    except Exception:
        logger.exception(
            "Skipping unparsable assembly JSONL row (accession=%r)", raw.get("accession")
        )
        return None


def _taxid_from_assembly_dict(assembly: Dict[str, Any]) -> str:
    org = assembly.get("organism") or {}
    raw = org.get("tax_id")
    if raw is None:
        return ""
    return str(raw).strip()


def _sample_accession_from_assembly_dict(assembly: Dict[str, Any]) -> str:
    info = assembly.get("assembly_info") or {}
    bio = info.get("biosample") or {}
    if not isinstance(bio, dict):
        return ""
    acc = bio.get("accession")
    return str(acc).strip() if acc else ""


def merge_assembly_jsonl_rows_from_paths(
    file_paths: List[str],
) -> Tuple[List[Dict[str, Any]], Dict[str, Dict[str, Any]]]:
    """
    Read one or more JSONL files produced by NCBI datasets.

    Returns:
        ``new_rows``: dicts for accessions not yet in the DB (last file wins on duplicate accession).
        ``assemblies_to_update``: existing accession -> full datasets record for metadata refresh.
    """
    existing_accessions = set(Assembly.objects().scalar("accession"))
    new_by_acc: Dict[str, Dict[str, Any]] = {}
    assemblies_to_update: Dict[str, Dict[str, Any]] = {}

    for path in file_paths:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                assembly = json.loads(line)
                acc = assembly.get("accession")
                if not acc:
                    logger.warning("Skipping JSONL row without accession (%s)", path)
                    continue
                if acc in existing_accessions:
                    assemblies_to_update[acc] = assembly
                else:
                    new_by_acc[acc] = assembly

    return list(new_by_acc.values()), assemblies_to_update


def collect_taxids_from_assembly_rows(
    new_rows: List[Dict[str, Any]],
    assemblies_to_update: Dict[str, Dict[str, Any]],
) -> Set[str]:
    out: Set[str] = set()
    for row in new_rows:
        tid = _taxid_from_assembly_dict(row)
        if tid:
            out.add(tid)
    for row in assemblies_to_update.values():
        tid = _taxid_from_assembly_dict(row)
        if tid:
            out.add(tid)
    return out


def collect_sample_accessions_for_taxids(
    new_rows: List[Dict[str, Any]],
    assemblies_to_update: Dict[str, Dict[str, Any]],
    taxids_with_organism: Set[str],
) -> List[str]:
    """Biosample accessions from rows whose taxid has an Organism after taxonomy import."""
    seen: Set[str] = set()
    ordered: List[str] = []
    for row in list(new_rows) + list(assemblies_to_update.values()):
        tid = _taxid_from_assembly_dict(row)
        if not tid or tid not in taxids_with_organism:
            continue
        sa = _sample_accession_from_assembly_dict(row)
        if sa and sa not in seen:
            seen.add(sa)
            ordered.append(sa)
    return ordered


def persist_assembly_import_payload(
    new_rows: List[Dict[str, Any]],
    assemblies_to_update: Dict[str, Dict[str, Any]],
    *,
    taxids_with_organism: Set[str],
) -> List[str]:
    """
    Insert new assemblies, update existing metadata, and fetch chromosomes for new accessions.

    Rows are skipped unless the taxon exists in ``taxids_with_organism``. Missing or
    unfetched biosamples do not block assembly persistence.

    Returns accessions **newly inserted** in this run (for downstream cleanup / chromosomes).
    """

    def allowed(assembly_dict: Dict[str, Any]) -> bool:
        tid = _taxid_from_assembly_dict(assembly_dict)
        return bool(tid) and tid in taxids_with_organism

    for acc, assembly in assemblies_to_update.items():
        if not allowed(assembly):
            logger.info(
                "Skip metadata update for assembly %s (no organism for taxon)", acc
            )
            continue
        try:
            Assembly.objects(accession=acc).update(metadata=assembly)
        except Exception:
            logger.exception("Failed to update metadata for assembly %s", acc)

    by_new_accession: Dict[str, Assembly] = {}
    for row in new_rows:
        if not allowed(row):
            logger.info(
                "Skip insert for assembly %r (no organism for taxon)",
                row.get("accession"),
            )
            continue
        doc = _parse_assembly_document(row)
        if doc and doc.accession:
            # Last row wins; avoids BulkWriteError if JSONL ever repeats an accession.
            by_new_accession[str(doc.accession).strip()] = doc

    to_insert = list(by_new_accession.values())
    new_assembly_accessions: List[str] = []

    if to_insert:
        try:
            Assembly.objects.insert(to_insert)
            new_assembly_accessions = [d.accession for d in to_insert if d.accession]
            logger.info("Bulk inserted %s new assembly document(s)", len(to_insert))
        except Exception:
            logger.exception(
                "Bulk assembly insert failed; falling back to per-document save/update"
            )
            for doc in to_insert:
                acc = doc.accession
                if not acc:
                    continue
                try:
                    doc.save()
                    new_assembly_accessions.append(acc)
                except (NotUniqueError, ValidationError):
                    try:
                        Assembly.objects(accession=acc).update(metadata=doc.metadata)
                        logger.debug(
                            "Assembly %s already existed; updated metadata from JSONL", acc
                        )
                    except Exception:
                        logger.exception(
                            "Failed to update metadata for duplicate assembly %s", acc
                        )
                except Exception:
                    logger.exception("Failed to save assembly %s", acc)

    if new_assembly_accessions:
        save_chromosomes_bulk_and_update_assemblies(new_assembly_accessions)

    return new_assembly_accessions


# --- BlobToolKit bulk link ----------------------------------------------------


def bulk_link_blobtoolkit_for_assembly_accessions(
    accessions: Iterable[str],
    *,
    max_workers: int = 8,
    write_chunk_size: int = 200,
    fetch_batch_size: Optional[int] = None,
) -> Dict[str, int]:
    """
    Resolve BlobToolKit view ids for the given assembly accessions (parallel HTTP),
    then persist with pymongo ``bulk_write``.

    Only updates documents that still have ``blobtoolkit_id=None`` and ``accession`` in
    the deduplicated input list.

    **Memory:** HTTP work is done in waves of at most ``fetch_batch_size`` concurrent
    futures (default ``max(256, max_workers * 64)``), and Mongo writes flush whenever
    ``write_chunk_size`` pairs are ready—peak RAM scales with those caps, not total N.

    **Threads:** ``ThreadPoolExecutor`` is appropriate for I/O-bound ``requests`` calls;
    each worker uses independent HTTP requests (no shared ``Session``). ``bulk_write``
    runs only on the calling thread after each wave completes.
    """
    pending = list(
        dict.fromkeys(str(a).strip() for a in accessions if a and str(a).strip())
    )
    if not pending:
        return {"blobtoolkit_updated": 0, "blobtoolkit_no_hit": 0, "blobtoolkit_api_errors": 0}

    missing = list(
        Assembly.objects(accession__in=pending, blobtoolkit_id=None).scalar("accession")
    )
    if not missing:
        return {"blobtoolkit_updated": 0, "blobtoolkit_no_hit": 0, "blobtoolkit_api_errors": 0}

    wave_size = fetch_batch_size if fetch_batch_size is not None else max(256, max_workers * 64)
    buffer: List[Tuple[str, str]] = []
    api_errors = 0
    no_hit = 0
    updated = 0
    coll = Assembly._get_collection()

    def flush_buffer() -> None:
        nonlocal updated, buffer
        while len(buffer) >= write_chunk_size:
            chunk = buffer[:write_chunk_size]
            del buffer[:write_chunk_size]
            ops = [
                UpdateOne({"accession": acc}, {"$set": {"blobtoolkit_id": bid}})
                for acc, bid in chunk
            ]
            coll.bulk_write(ops, ordered=False)
            updated += len(ops)

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        for wave in create_batches(missing, wave_size):
            future_map = {
                executor.submit(fetch_blobtoolkit_first_name, acc): acc for acc in wave
            }
            for fut in as_completed(future_map):
                acc = future_map[fut]
                try:
                    name = fut.result()
                except Exception:
                    api_errors += 1
                    logger.exception("BlobToolKit lookup failed for assembly %s", acc)
                    continue
                if name:
                    buffer.append((acc, name))
                    flush_buffer()
                else:
                    no_hit += 1

    if buffer:
        ops = [
            UpdateOne({"accession": acc}, {"$set": {"blobtoolkit_id": bid}})
            for acc, bid in buffer
        ]
        coll.bulk_write(ops, ordered=False)
        updated += len(ops)

    return {
        "blobtoolkit_updated": updated,
        "blobtoolkit_no_hit": no_hit,
        "blobtoolkit_api_errors": api_errors,
    }
