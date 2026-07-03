"""
Import organisms from a TSV (taxid column + extra metadata columns).

Uses :func:`~jobs.support.catalog_taxonomy_bootstrap.handle_full_taxonomy_from_taxids`
then merges row metadata into :class:`~db.model.Organism`.metadata,
propagates ``Organism`` lineages to catalog rows and TaxonNode edges for the TSV taxids
(:func:`~jobs.support.catalog_denorm_finalize.bulk_copy_organism_lineages_to_catalog`), then
refreshes :class:`~db.model.TaxonNode` catalog counters via
:func:`~jobs.support.stats.update_taxon_node_counts` (no INSDC/GoaT status pass), and runs
:func:`~jobs.support.organism_enrich.run_enrich_followup_for_taxids` in-process.

Large inputs are processed in row batches (see ``ORGANISM_TSV_IMPORT_BATCH_ROWS``) so peak
memory stays bounded by batch size plus unique-taxid tracking, not full parse structures.

REST uploads are written to ``TMP_DIR`` and the job receives ``tsv_path`` only (like GoaT report
upload); the worker streams from disk and deletes the file when done. Use a shared ``/tmp`` volume
between API and Celery in Compose.
"""

from __future__ import annotations

import csv
import logging
import os
from io import StringIO
from typing import Any, Dict, Iterator, List, Optional, Set, Tuple

from celery import shared_task
from pymongo import UpdateOne

from db.model import Organism
from helpers.data import create_batches
from helpers.upload_temp import safe_unlink
from jobs.support.catalog_ingest_guard import prune_organisms_missing_taxon_lineage
from jobs.support.catalog_taxonomy_bootstrap import handle_full_taxonomy_from_taxids
from jobs.support.organism_enrich import run_enrich_followup_for_taxids
from jobs.taxonomy import cleanup_catalog_outside_root_lineage

logger = logging.getLogger(__name__)

DEFAULT_MAX_TSV_BYTES = int(os.getenv("ORGANISM_TSV_IMPORT_MAX_BYTES", str(10 * 1024 * 1024)))
DEFAULT_BATCH_ROWS = int(os.getenv("ORGANISM_TSV_IMPORT_BATCH_ROWS", "2000"))
# Batched ``$in`` + bulk_write chunk size (BSON / round-trip bounds).
_METADATA_MERGE_CHUNK = int(os.getenv("ORGANISM_TSV_METADATA_MERGE_CHUNK", "500"))
TMP_DIR = os.getenv("TMP_DIR", "/tmp")


def _parse_header(header_row: List[str]) -> Tuple[List[str], int]:
    headers = [(h or "").strip() for h in header_row]
    taxid_idx: Optional[int] = None
    for i, h in enumerate(headers):
        if h.lower() == "taxid":
            taxid_idx = i
            break
    if taxid_idx is None:
        raise ValueError("Missing required column: taxid")
    return headers, taxid_idx


def _row_to_taxid_meta(
    headers: List[str],
    taxid_idx: int,
    row: List[str],
) -> Tuple[Optional[str], Dict[str, Any]]:
    """Return ``(taxid, meta)`` or ``(None, {})`` to skip the row."""
    if not row or all(not (c or "").strip() for c in row):
        return None, {}
    if taxid_idx >= len(row):
        return None, {}
    raw_tid = (row[taxid_idx] or "").strip()
    if not raw_tid:
        return None, {}
    meta: Dict[str, Any] = {}
    for i, key in enumerate(headers):
        if i == taxid_idx or not key:
            continue
        if i >= len(row):
            continue
        val = (row[i] or "").strip()
        if val:
            meta[key] = val
    return raw_tid, meta


def _flush_batch(
    batch: List[Tuple[str, Dict[str, Any]]],
) -> Tuple[List[str], Dict[str, Dict[str, Any]]]:
    """Same duplicate semantics as full-file parse: order preserved, later row merges meta."""
    ordered: List[str] = []
    seen: Set[str] = set()
    by_taxid: Dict[str, Dict[str, Any]] = {}
    for tid, meta in batch:
        if tid not in seen:
            seen.add(tid)
            ordered.append(tid)
            by_taxid[tid] = dict(meta)
        else:
            by_taxid[tid].update(meta)
    return ordered, by_taxid


def _iter_batches_from_csv_reader(
    reader: csv.reader,
    headers: List[str],
    taxid_idx: int,
    batch_rows: int,
) -> Iterator[Tuple[int, List[str], Dict[str, Dict[str, Any]]]]:
    """Yield batches from a positioned :class:`csv.reader` (header row already consumed)."""
    if batch_rows < 1:
        batch_rows = DEFAULT_BATCH_ROWS

    pending: List[Tuple[str, Dict[str, Any]]] = []
    n_in_pending = 0

    for row in reader:
        tid, meta = _row_to_taxid_meta(headers, taxid_idx, row)
        if tid is None:
            if row and not all(not (c or "").strip() for c in row):
                if taxid_idx < len(row) and not (row[taxid_idx] or "").strip():
                    logger.warning("Skipping row with empty taxid")
            continue
        pending.append((tid, meta))
        n_in_pending += 1
        if n_in_pending >= batch_rows:
            flushed = _flush_batch(pending)
            yield len(pending), flushed[0], flushed[1]
            pending = []
            n_in_pending = 0

    if pending:
        flushed = _flush_batch(pending)
        yield len(pending), flushed[0], flushed[1]


def is_allowed_organism_tsv_import_path(path: str, tmp_dir: str | None = None) -> bool:
    """
    Reject path traversal / unexpected files: must live under ``tmp_dir`` and use the
    upload naming convention from :func:`helpers.upload_temp.save_upload_to_temp`.
    """
    tmp_dir = tmp_dir or TMP_DIR
    try:
        base = os.path.basename(path)
        if not base.startswith("organism_tsv_import_") or not base.endswith(".tsv"):
            return False
        tmp_real = os.path.realpath(tmp_dir)
        path_real = os.path.realpath(path)
    except OSError:
        return False
    if not path_real.startswith(tmp_real + os.sep):
        return False
    return os.path.isfile(path_real)

def iter_organism_tsv_batches(
    tsv_text: str,
    *,
    batch_rows: int = DEFAULT_BATCH_ROWS,
) -> Iterator[Tuple[int, List[str], Dict[str, Dict[str, Any]]]]:
    """
    Stream-parse TSV string and yield ``(n_data_rows, ordered_unique_taxids_in_batch, taxid -> metadata)``.

    Each chunk has at most ``batch_rows`` **non-empty** data rows (rows with a non-empty taxid);
    completely blank lines are skipped and do not count toward the limit.
    """
    if not (tsv_text or "").strip():
        raise ValueError("TSV is empty")

    stream = StringIO(tsv_text.lstrip("\ufeff"))
    reader = csv.reader(stream, delimiter="\t")
    try:
        header_row = next(reader)
    except StopIteration as exc:
        raise ValueError("TSV has no header row") from exc

    headers, taxid_idx = _parse_header(header_row)
    yield from _iter_batches_from_csv_reader(reader, headers, taxid_idx, batch_rows)


def iter_organism_tsv_batches_from_path(
    path: str,
    *,
    batch_rows: int = DEFAULT_BATCH_ROWS,
) -> Iterator[Tuple[int, List[str], Dict[str, Dict[str, Any]]]]:
    """
    Stream-parse a UTF-8 (with BOM) TSV file from disk. The file stays open until iteration
    finishes (``with`` + ``yield from``).
    """
    if batch_rows < 1:
        batch_rows = DEFAULT_BATCH_ROWS

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f, delimiter="\t")
        try:
            header_row = next(reader)
        except StopIteration as exc:
            raise ValueError("TSV has no header row") from exc
        headers, taxid_idx = _parse_header(header_row)
        yield from _iter_batches_from_csv_reader(reader, headers, taxid_idx, batch_rows)


def parse_organism_import_tsv(tsv_text: str) -> Tuple[List[str], Dict[str, Dict[str, Any]]]:
    """
    Parse entire TSV into ``(ordered_unique_taxids, taxid -> metadata)``.

    Duplicate taxids: metadata dicts are merged; later rows override keys.

    For large files prefer :func:`iter_organism_tsv_batches` to avoid holding two full maps.
    """
    ordered_acc: List[str] = []
    seen: Set[str] = set()
    by_taxid: Dict[str, Dict[str, Any]] = {}

    for _n_rows, ordered_batch, by_batch in iter_organism_tsv_batches(tsv_text):
        for tid in ordered_batch:
            if tid not in seen:
                seen.add(tid)
                ordered_acc.append(tid)
        for tid, meta in by_batch.items():
            if tid in by_taxid:
                by_taxid[tid].update(meta)
            else:
                by_taxid[tid] = dict(meta)

    if not ordered_acc:
        raise ValueError("No data rows with a non-empty taxid")

    return ordered_acc, by_taxid


def _run_organism_tsv_import_batches(
    batch_source: Iterator[Tuple[int, List[str], Dict[str, Dict[str, Any]]]],
    *,
    tmp_dir: str,
    batch_rows: int,
    iucn_force: bool,
) -> Dict[str, Any]:
    """Shared loop for path- or string-backed batch iterators."""
    species_order: List[str] = []
    species_seen: Set[str] = set()
    saved_taxonomy: List[str] = []
    merged_total = 0
    missing_all: List[str] = []
    data_rows_total = 0
    batch_index = 0
    taxonomy_initialized: Set[str] = set()

    for n_rows, ordered_batch, by_taxid_batch in batch_source:
        batch_index += 1
        data_rows_total += n_rows

        for tid in ordered_batch:
            if tid not in species_seen:
                species_seen.add(tid)
                species_order.append(tid)

        new_taxids_for_bootstrap = [
            t for t in ordered_batch if t not in taxonomy_initialized
        ]
        if new_taxids_for_bootstrap:
            saved_batch = handle_full_taxonomy_from_taxids(
                new_taxids_for_bootstrap, tmp_dir
            )
            saved_taxonomy.extend(saved_batch)
            taxonomy_initialized.update(new_taxids_for_bootstrap)

        m, miss = _merge_metadata_for_taxids(by_taxid_batch)
        merged_total += m
        missing_all.extend(miss)

        if batch_index == 1 or batch_index % 10 == 0:
            logger.info(
                "organism_tsv_import: processed batch %s (%s data rows in this chunk, batch_rows=%s)",
                batch_index,
                n_rows,
                batch_rows,
            )

    if not species_order:
        logger.info("helpers_import_organisms_from_tsv: no taxids after streaming parse")
        return {"status": "error", "reason": "no_taxids"}

    logger.info(
        "organism_tsv_import: taxonomy bootstrap reported %s new organism taxid(s) (cumulative)",
        len(saved_taxonomy),
    )
    # Scope pruning to taxids this run actually bootstrapped (newly created organisms only) —
    # never the full `species_order`, since that also contains taxids that already had an
    # Organism before this import (e.g. manually curated ones intentionally without catalog
    # rows yet). Those pre-existing organisms must never be deleted as a side effect of an
    # unrelated metadata-only TSV import.
    if saved_taxonomy:
        prune_organisms_missing_taxon_lineage(saved_taxonomy)

    missing_unique = sorted(set(missing_all))
    if missing_unique:
        logger.warning(
            "organism_tsv_import: no Organism document for %s taxid(s) after taxonomy step: %s",
            len(missing_unique),
            missing_unique[:50],
        )

    from jobs.support.catalog_denorm_finalize import bulk_copy_organism_lineages_to_catalog
    from jobs.support.stats import update_taxon_node_counts

    bulk_copy_organism_lineages_to_catalog(species_order)
    update_taxon_node_counts(species_order)
    logger.info(
        "organism_tsv_import: bulk lineage copy + taxon node counts for %s species taxid(s)",
        len(species_order),
    )

    enrich_result = run_enrich_followup_for_taxids(
        species_order,
        iucn_force=bool(iucn_force),
    )

    return {
        "status": "ok",
        "taxids": len(species_order),
        "data_rows": data_rows_total,
        "batches": batch_index,
        "batch_rows": batch_rows,
        "metadata_merged": merged_total,
        "missing_organisms": missing_unique,
        "taxonomy_new_inserts_reported": len(saved_taxonomy),
        "taxon_node_counts_refreshed": True,
        "enrich": enrich_result,
    }


def _merge_metadata_for_taxids(taxid_to_meta: Dict[str, Dict[str, Any]]) -> Tuple[int, List[str]]:
    """
    Merge each metadata map into the corresponding ``Organism.metadata``.

    Uses chunked ``taxid__in`` reads and ``bulk_write`` to avoid one round trip per row.

    Returns (updated_count, taxids_missing_organism).
    """
    if not taxid_to_meta:
        return 0, []

    missing: List[str] = []
    updated = 0
    coll = Organism._get_collection()
    chunk_size = max(1, _METADATA_MERGE_CHUNK)
    keys = list(taxid_to_meta.keys())

    for chunk in create_batches(keys, chunk_size):
        tids = list(chunk)
        orgs = list(
            Organism.objects(taxid__in=tids).only("taxid", "metadata")
        )
        org_by = {str(o.taxid).strip(): o for o in orgs if o.taxid is not None}

        ops: List[UpdateOne] = []
        for tid in tids:
            tid_s = str(tid).strip()
            incoming = taxid_to_meta[tid]
            org = org_by.get(tid_s)
            if org is None:
                missing.append(tid_s)
                continue
            base = dict(org.metadata or {})
            base.update(incoming)
            ops.append(UpdateOne({"taxid": tid_s}, {"$set": {"metadata": base}}))

        if ops:
            coll.bulk_write(ops, ordered=False)
            updated += len(ops)

    return updated, missing


@shared_task(name="helpers_import_organisms_from_tsv", ignore_result=False)
def import_organisms_from_tsv_task(
    tsv_path: Optional[str] = None,
    tsv_text: Optional[str] = None,
    iucn_force: bool = False,
) -> Dict[str, Any]:
    """
    :param tsv_path: Absolute path to a UTF-8 TSV saved under ``TMP_DIR`` by the REST upload
        handler (small Celery/Redis payload). The file is removed after processing.
    :param tsv_text: Optional full TSV body for ``POST /api/cronjob/...`` with JSON ``kwargs``
        only (not used together with ``tsv_path``).
    :param iucn_force: Passed to :func:`~jobs.support.organism_enrich.run_enrich_followup_for_taxids`.

    After ingest, runs :func:`~jobs.support.catalog_denorm_finalize.bulk_copy_organism_lineages_to_catalog`
    and :func:`~jobs.support.stats.update_taxon_node_counts` for the import's species taxids —
    no full-DB recount and no INSDC/GoaT status update.

    Row batches (default 2000, ``ORGANISM_TSV_IMPORT_BATCH_ROWS``) limit peak parse memory.
    """
    batch_rows = DEFAULT_BATCH_ROWS

    if tsv_path:
        if not is_allowed_organism_tsv_import_path(tsv_path, TMP_DIR):
            logger.error("helpers_import_organisms_from_tsv: invalid or disallowed path %r", tsv_path)
            safe_unlink(tsv_path)
            return {"status": "error", "reason": "invalid_tsv_path"}
        try:
            result = _run_organism_tsv_import_batches(
                iter_organism_tsv_batches_from_path(tsv_path, batch_rows=batch_rows),
                tmp_dir=TMP_DIR,
                batch_rows=batch_rows,
                iucn_force=iucn_force,
            )
            result["root_lineage_cleanup"] = cleanup_catalog_outside_root_lineage()
            return result
        except Exception:
            logger.exception("helpers_import_organisms_from_tsv: failed processing %r", tsv_path)
            raise
        finally:
            safe_unlink(tsv_path)

    if tsv_text is not None and str(tsv_text).strip():
        result = _run_organism_tsv_import_batches(
            iter_organism_tsv_batches(str(tsv_text), batch_rows=batch_rows),
            tmp_dir=TMP_DIR,
            batch_rows=batch_rows,
            iucn_force=iucn_force,
        )
        result["root_lineage_cleanup"] = cleanup_catalog_outside_root_lineage()
        return result

    logger.info("helpers_import_organisms_from_tsv: missing tsv_path and tsv_text")
    return {"status": "error", "reason": "empty_tsv"}


def validate_tsv_payload_size(raw: bytes, max_bytes: int | None = None) -> None:
    """Raise ValueError if payload exceeds limit."""
    limit = max_bytes if max_bytes is not None else DEFAULT_MAX_TSV_BYTES
    if len(raw) > limit:
        raise ValueError(f"TSV exceeds maximum size ({limit} bytes)")


def validate_tsv_upload_file_size(path: str, max_bytes: int | None = None) -> None:
    """Raise ValueError if file on disk exceeds limit (used after ``save_upload_to_temp``)."""
    limit = max_bytes if max_bytes is not None else DEFAULT_MAX_TSV_BYTES
    try:
        sz = os.path.getsize(path)
    except OSError as exc:
        raise ValueError(f"Cannot read upload size: {exc}") from exc
    if sz > limit:
        raise ValueError(f"TSV exceeds maximum size ({limit} bytes)")
