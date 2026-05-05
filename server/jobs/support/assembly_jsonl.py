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
import sqlite3
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from typing import Any, AsyncIterator, Dict, Iterable, List, Optional, Set, Tuple

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

# Large assembly imports: bound RAM (see docs / ingest plan).
ASSEMBLY_IMPORT_EXISTENCE_BATCH = 5000
ASSEMBLY_IMPORT_PERSIST_CHUNK = 1000
# Fetch/persist NCBI assembly reports in slices (async gather + DB writes per slice).
CHROMOSOME_PERSIST_SLICE_SIZE = 48

# --- Chromosome bulk (NCBI assembly reports) ---------------------------------

_ASSEMBLY_REPORT_ROLE_COL = "Sequence-Role"
_ASSEMBLY_REPORT_ACCN_COL_GENBANK = "GenBank-Accn"
_ASSEMBLY_REPORT_ACCN_COL_REFSEQ = "RefSeq-Accn"
_CHROMOSOME_ROLE = "assembled-molecule"


async def _chromosomes_from_line_iterator(
    lines: AsyncIterator[str],
    assembly_accession: str,
) -> List[Chromosome]:
    """Parse assembled-molecule rows from an async line iterator (shared by URL stream paths)."""
    chromosomes: List[Chromosome] = []
    is_refseq = assembly_accession.upper().startswith("GCF_")
    accn_col = _ASSEMBLY_REPORT_ACCN_COL_REFSEQ if is_refseq else _ASSEMBLY_REPORT_ACCN_COL_GENBANK
    header = None
    role_idx = accn_idx = 0
    async for line in lines:
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


async def _fetch_chromosomes_from_report_url(
    session: aiohttp.ClientSession, assembly_accession: str, report_url: str
) -> List[Chromosome]:
    """
    Stream assembly report from URL, parse chromosomes (assembled-molecule rows),
    set metadata.assembly_accession on each, and return the list.
    """
    return await _chromosomes_from_line_iterator(
        ncbi_assembly_http.stream_report_lines(session, report_url),
        assembly_accession,
    )


async def _fetch_chromosomes_for_one_assembly(
    session: aiohttp.ClientSession,
    assembly_accession: str,
    assembly_name: Optional[str],
) -> List[Chromosome]:
    """
    Try deterministic FTP-derived report URL (single GET + parse); on failure scrape paths
    then stream report (same as legacy flow).
    """
    candidate: Optional[str] = None
    if assembly_name:
        candidate = ncbi_assembly_http.build_candidate_assembly_report_url(
            assembly_accession, assembly_name
        )
    if candidate:
        try:
            async with session.get(
                candidate, timeout=aiohttp.ClientTimeout(total=60)
            ) as resp:
                if resp.status == 200:
                    return await _chromosomes_from_line_iterator(
                        ncbi_assembly_http.iter_report_body_lines(resp),
                        assembly_accession,
                    )
        except Exception as e:
            logger.debug(
                "Candidate assembly report GET failed for %s (%s); falling back to scrape: %s",
                assembly_accession,
                candidate,
                e,
            )
    report_url = await ncbi_assembly_http.get_assembly_report_url(
        session, assembly_accession
    )
    if not report_url:
        return []
    return await _fetch_chromosomes_from_report_url(
        session, assembly_accession, report_url
    )


async def fetch_chromosomes_for_assemblies_bulk(
    items: List[Tuple[str, Optional[str]]],
) -> Dict[str, List[Chromosome]]:
    """
    Fetch and parse assembly reports concurrently (one GET when deterministic URL works,
    otherwise scrape then GET). Returns a dict mapping assembly accession to chromosomes.
    """
    if not items:
        return {}
    connector = aiohttp.TCPConnector(
        limit=min(len(items), ncbi_assembly_http.NCBI_CONCURRENT_CONNECTIONS),
        limit_per_host=ncbi_assembly_http.NCBI_CONCURRENT_CONNECTIONS,
    )
    result: Dict[str, List[Chromosome]] = {}
    ok_with_rows = 0
    unsuccessful = 0
    async with aiohttp.ClientSession(connector=connector) as session:
        tasks = [
            _fetch_chromosomes_for_one_assembly(session, acc, name)
            for acc, name in items
        ]
        batch_results = await asyncio.gather(*tasks, return_exceptions=True)
        for (acc, _), value in zip(items, batch_results):
            if isinstance(value, Exception):
                unsuccessful += 1
                logger.warning(
                    "Assembly report fetch failed for %s: %s", acc, value
                )
                continue
            result[acc] = value
            if value:
                ok_with_rows += 1
            else:
                unsuccessful += 1
    logger.info(
        "Assembly *_assembly_report.txt bulk fetch finished: %s assemblies with a "
        "successful report parse (assembled-molecule rows), %s unsuccessful "
        "(HTTP/error, unresolved URL, or empty parse)",
        ok_with_rows,
        unsuccessful,
    )
    return result


def fetch_chromosomes_for_assemblies_bulk_sync(
    items: List[Tuple[str, Optional[str]]],
) -> Dict[str, List[Chromosome]]:
    """Synchronous wrapper for fetch_chromosomes_for_assemblies_bulk."""
    return asyncio.run(fetch_chromosomes_for_assemblies_bulk(items))


def _persist_chromosomes_wave_and_update_assemblies(
    chroms_by_assembly: Dict[str, List[Chromosome]],
    *,
    carried_existing_versions: Set[str],
) -> Set[str]:
    """
    Persist one wave of fetched chromosome lists. ``carried_existing_versions`` holds
    accession_version strings already present or inserted in prior slices; it is
    updated the same way as the original single-block implementation.
    """
    all_versions: set[str] = set()
    for chroms in chroms_by_assembly.values():
        for c in chroms:
            if c.accession_version:
                all_versions.add(c.accession_version)
    existing_versions: Set[str] = set(carried_existing_versions)
    if all_versions:
        existing_versions.update(
            Chromosome.objects(accession_version__in=list(all_versions)).scalar(
                "accession_version"
            )
        )

    for acc, chroms in chroms_by_assembly.items():
        if not chroms:
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
    return existing_versions


def save_chromosomes_bulk_and_update_assemblies(
    items: List[Tuple[str, Optional[str]]],
    *,
    slice_size: int = CHROMOSOME_PERSIST_SLICE_SIZE,
) -> None:
    """
    Fetch chromosomes from NCBI assembly reports in bulk for the given
    ``(accession, assembly_name)`` pairs (assembly_name used for fast-path URL),
    save chromosome documents, and update each assembly's chromosomes list.

    Skips assemblies with no parsed ``assembled-molecule`` rows so we do not delete
    existing chromosome documents on an empty or ambiguous fetch result.

    Large imports process assemblies in slices so peak RAM stays bounded.
    """
    if not items:
        return
    carried: Set[str] = set()
    for slice_items in create_batches(items, max(slice_size, 1)):
        chroms_by_assembly = fetch_chromosomes_for_assemblies_bulk_sync(list(slice_items))
        carried = _persist_chromosomes_wave_and_update_assemblies(
            chroms_by_assembly,
            carried_existing_versions=carried,
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


def collect_sample_accessions_from_assembly_rows(
    new_rows: List[Dict[str, Any]],
    assemblies_to_update: Dict[str, Dict[str, Any]],
) -> List[str]:
    """Biosample accessions from any row with a non-empty taxid (used before organism exists)."""
    seen: Set[str] = set()
    ordered: List[str] = []
    for row in list(new_rows) + list(assemblies_to_update.values()):
        tid = _taxid_from_assembly_dict(row)
        if not tid:
            continue
        sa = _sample_accession_from_assembly_dict(row)
        if sa and sa not in seen:
            seen.add(sa)
            ordered.append(sa)
    return ordered


def _allowed_assembly_row(
    assembly_dict: Dict[str, Any],
    *,
    taxids_with_organism: Optional[Set[str]],
) -> bool:
    tid = _taxid_from_assembly_dict(assembly_dict)
    if not tid:
        return False
    if taxids_with_organism is None:
        return True
    return tid in taxids_with_organism


def _persist_metadata_updates(
    assemblies_to_update: Dict[str, Dict[str, Any]],
    *,
    taxids_with_organism: Optional[Set[str]] = None,
) -> None:
    for acc, assembly in assemblies_to_update.items():
        if not _allowed_assembly_row(assembly, taxids_with_organism=taxids_with_organism):
            logger.info(
                "Skip metadata update for assembly %s (no organism for taxon)", acc
            )
            continue
        try:
            Assembly.objects(accession=acc).update(metadata=assembly)
        except Exception:
            logger.exception("Failed to update metadata for assembly %s", acc)


def _persist_new_inserts(
    new_rows: List[Dict[str, Any]],
    *,
    taxids_with_organism: Optional[Set[str]] = None,
) -> List[str]:
    """
    Insert new assemblies from JSONL dict rows.
    Returns accessions newly inserted in this call.
    """
    by_new_accession: Dict[str, Assembly] = {}
    for row in new_rows:
        if not _allowed_assembly_row(row, taxids_with_organism=taxids_with_organism):
            logger.info(
                "Skip insert for assembly %r (no organism for taxon)",
                row.get("accession"),
            )
            continue
        doc = _parse_assembly_document(row)
        if doc and doc.accession:
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

    return new_assembly_accessions


def persist_assembly_import_payload(
    new_rows: List[Dict[str, Any]],
    assemblies_to_update: Dict[str, Dict[str, Any]],
    *,
    taxids_with_organism: Optional[Set[str]] = None,
) -> List[str]:
    """
    Insert new assemblies and update existing metadata.

    When ``taxids_with_organism`` is set, rows are skipped unless the taxon exists in that set.
    When ``None`` (primary-first ingest), any row with a non-empty taxid is persisted; orphans
    are removed after taxonomy bootstrap. Missing or unfetched biosamples do not block assembly
    persistence.

    Returns accessions **newly inserted** in this run (for downstream cleanup / follow-up jobs).
    """
    _persist_metadata_updates(
        assemblies_to_update, taxids_with_organism=taxids_with_organism
    )
    return _persist_new_inserts(new_rows, taxids_with_organism=taxids_with_organism)


# --- SQLite staging (bounded RAM for large imports) ---------------------------


@dataclass
class AssemblyImportStagingResult:
    """Outputs matching downstream assembly import pipeline needs."""

    staging_accession_count: int
    saved_assembly_accessions: List[str]
    all_taxids: Set[str]
    assembly_biosample_accessions: List[str]
    assembly_row_by_biosample: Dict[str, Dict[str, Any]]


def stream_assembly_jsonl_into_sqlite(file_paths: List[str], db_path: str) -> int:
    """
    Merge JSONL paths into SQLite with last-line-wins payload per accession and
    ``first_seq`` = line index of first appearance (for ordering parity with in-memory merge).

    Returns the number of non-empty lines read from the files (including skipped-invalid lines
    that advanced the stream). ``part`` is 0 for all rows until :func:`mark_staging_partitions`.
    """
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute(
            """
            CREATE TABLE staging (
                accession TEXT PRIMARY KEY,
                payload_json TEXT NOT NULL,
                line_seq INTEGER NOT NULL,
                first_seq INTEGER NOT NULL,
                part INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        lines_read = 0
        for path in file_paths:
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    lines_read += 1
                    try:
                        assembly = json.loads(line)
                    except json.JSONDecodeError:
                        logger.warning("Skipping invalid JSON line in %s", path)
                        continue
                    acc = assembly.get("accession")
                    if not acc:
                        logger.warning("Skipping JSONL row without accession (%s)", path)
                        continue
                    acc = str(acc).strip()
                    if not acc:
                        continue
                    payload = json.dumps(assembly)
                    conn.execute(
                        """
                        INSERT INTO staging (accession, payload_json, line_seq, first_seq, part)
                        VALUES (?, ?, ?, ?, 0)
                        ON CONFLICT(accession) DO UPDATE SET
                            payload_json = excluded.payload_json,
                            line_seq = excluded.line_seq,
                            first_seq = MIN(staging.first_seq, excluded.first_seq)
                        """,
                        (acc, payload, lines_read, lines_read),
                    )
        conn.commit()
        return lines_read
    finally:
        conn.close()


def mark_staging_partitions(
    conn: sqlite3.Connection,
    *,
    existence_batch: int = ASSEMBLY_IMPORT_EXISTENCE_BATCH,
) -> None:
    """
    Set ``staging.part`` to 1 for accessions that exist in Mongo at call time (import snapshot).
    Rows with part 0 are treated as new inserts; part 1 as metadata updates.
    """
    cur = conn.execute("SELECT accession FROM staging")
    all_accs = [r[0] for r in cur.fetchall()]
    for batch in create_batches(all_accs, existence_batch):
        found_raw = Assembly.objects(accession__in=list(batch)).scalar("accession")
        found = {str(x) for x in found_raw if x}
        if not found:
            continue
        conn.executemany(
            "UPDATE staging SET part = 1 WHERE accession = ?",
            [(a,) for a in found],
        )
    conn.commit()


def _derive_taxids_and_biosample_maps_from_staging(
    conn: sqlite3.Connection,
) -> Tuple[Set[str], List[str], Dict[str, Dict[str, Any]]]:
    """
    Same iteration order as ``list(new_rows) + list(assemblies_to_update.values())``:
    part 0 (new) ordered by ``first_seq``, then part 1 (update) ordered by ``first_seq``.
    """
    all_taxids: Set[str] = set()
    seen_bs: Set[str] = set()
    ordered_bs: List[str] = []
    asm_by_bs: Dict[str, Dict[str, Any]] = {}

    cur = conn.execute(
        "SELECT payload_json FROM staging ORDER BY part ASC, first_seq ASC"
    )
    for (raw,) in cur:
        row = json.loads(raw)
        tid = _taxid_from_assembly_dict(row)
        if tid:
            all_taxids.add(tid)
        sa = _sample_accession_from_assembly_dict(row)
        if tid and sa and sa not in seen_bs:
            seen_bs.add(sa)
            ordered_bs.append(sa)
        if tid and sa and sa not in asm_by_bs:
            asm_by_bs[sa] = row

    return all_taxids, ordered_bs, asm_by_bs


def persist_assembly_import_payload_from_staging(
    conn: sqlite3.Connection,
    *,
    persist_chunk: int = ASSEMBLY_IMPORT_PERSIST_CHUNK,
    taxids_with_organism: Optional[Set[str]] = None,
) -> List[str]:
    """
    Run metadata updates for all ``part=1`` rows, then chunked inserts for ``part=0`` rows.
    Matches :func:`persist_assembly_import_payload` semantics.
    """
    saved_all: List[str] = []

    cur = conn.execute(
        "SELECT accession, payload_json FROM staging WHERE part = 1 ORDER BY first_seq"
    )
    while True:
        rows = cur.fetchmany(persist_chunk)
        if not rows:
            break
        upd: Dict[str, Dict[str, Any]] = {}
        for acc, raw in rows:
            upd[acc] = json.loads(raw)
        _persist_metadata_updates(upd, taxids_with_organism=taxids_with_organism)

    cur = conn.execute(
        "SELECT payload_json FROM staging WHERE part = 0 ORDER BY first_seq"
    )
    while True:
        rows = cur.fetchmany(persist_chunk)
        if not rows:
            break
        new_rows = [json.loads(r[0]) for r in rows]
        saved_all.extend(
            _persist_new_inserts(new_rows, taxids_with_organism=taxids_with_organism)
        )

    return saved_all


def run_assembly_import_merge_persist_bounded(
    file_paths: List[str],
    sqlite_db_path: str,
    *,
    persist_chunk: int = ASSEMBLY_IMPORT_PERSIST_CHUNK,
    taxids_with_organism: Optional[Set[str]] = None,
) -> AssemblyImportStagingResult:
    """
    Stream-merge JSONL into SQLite, classify new vs update using only batched existence checks
    for accessions in this import, persist in chunks, and derive taxid / biosample side data.

    Caller owns ``sqlite_db_path`` lifecycle (create before, remove after).
    """
    n_lines = stream_assembly_jsonl_into_sqlite(file_paths, sqlite_db_path)
    conn = sqlite3.connect(sqlite_db_path)
    try:
        n_rows = int(conn.execute("SELECT COUNT(*) FROM staging").fetchone()[0])
        if n_lines == 0 or n_rows == 0:
            return AssemblyImportStagingResult(
                staging_accession_count=0,
                saved_assembly_accessions=[],
                all_taxids=set(),
                assembly_biosample_accessions=[],
                assembly_row_by_biosample={},
            )

        mark_staging_partitions(conn)
        saved_assembly_accessions = persist_assembly_import_payload_from_staging(
            conn,
            persist_chunk=persist_chunk,
            taxids_with_organism=taxids_with_organism,
        )
        all_taxids, assembly_biosample_accessions, assembly_row_by_biosample = (
            _derive_taxids_and_biosample_maps_from_staging(conn)
        )
    finally:
        conn.close()

    return AssemblyImportStagingResult(
        staging_accession_count=n_rows,
        saved_assembly_accessions=saved_assembly_accessions,
        all_taxids=all_taxids,
        assembly_biosample_accessions=assembly_biosample_accessions,
        assembly_row_by_biosample=assembly_row_by_biosample,
    )


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
