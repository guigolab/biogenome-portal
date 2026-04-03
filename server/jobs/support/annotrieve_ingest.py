"""
Annotrieve fetch + ``GenomeAnnotation`` upsert helpers (no Celery).

Used by :mod:`jobs.annotrieve` tasks and tests.
"""

from __future__ import annotations

import datetime
import logging
import os
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests
from pymongo import UpdateOne

from clients.annotrieve_client import fetch_annotations_for_assembly_accessions, file_url
from db.constants import GOAT_PROJECT_NAME
from db.model import GenomeAnnotation
from helpers.data import create_batches
from jobs.support.catalog_ingest_pipeline import finalize_touched_species_catalog

logger = logging.getLogger(__name__)

ACCESSION_BATCH = int(os.getenv("ANNOTRIEVE_ACCESSION_BATCH", "200"))
BULK_CHUNK = int(os.getenv("ANNOTRIEVE_BULK_CHUNK", "500"))


def dedupe_assembly_accessions(accessions: Iterable[Any]) -> List[str]:
    """Stable dedupe of non-empty assembly accession strings."""
    return list(
        dict.fromkeys(
            str(a).strip() for a in accessions if a is not None and str(a).strip()
        )
    )


def annotation_row_to_bulk_op(row: Dict[str, Any]) -> Optional[UpdateOne]:
    annotation_id = row.get("annotation_id")
    if not annotation_id:
        logger.warning("Skipping annotation row without annotation_id: %s", row)
        return None
    idx = row.get("indexed_file_info") or {}
    if not isinstance(idx, dict):
        idx = {}
    gff_path = idx.get("bgzipped_path")
    index_path = idx.get("csi_path")
    gff_url = file_url(gff_path)
    index_url = file_url(index_path)
    if not gff_url or not index_url:
        logger.warning(
            "Skipping annotation %s: missing bgzipped_path or csi_path",
            annotation_id,
        )
        return None

    taxid = row.get("taxid")
    if taxid is None:
        logger.warning("Skipping annotation %s: missing taxid", annotation_id)
        return None

    asm_acc = row.get("assembly_accession")
    if asm_acc is None or not str(asm_acc).strip():
        logger.warning("Skipping annotation %s: missing assembly_accession", annotation_id)
        return None

    lineage = row.get("taxon_lineage") or []
    if not isinstance(lineage, list):
        lineage = []
    lineage_strs = [str(x) for x in lineage if x is not None]

    name = str(annotation_id)
    now = datetime.datetime.now()
    set_doc: Dict[str, Any] = {
        "name": name,
        "assembly_accession": str(asm_acc).strip(),
        "assembly_name": row.get("assembly_name"),
        "taxid": str(taxid),
        "scientific_name": str(row.get("organism_name") or ""),
        "taxon_lineage": lineage_strs,
        "gff_gz_location": gff_url,
        "tab_index_location": index_url,
        "metadata": dict(row),
        "external": True,
    }

    return UpdateOne(
        {"name": name},
        {"$set": set_doc, "$setOnInsert": {"created": now}},
        upsert=True,
    )


def annotation_rows_to_bulk_ops(
    rows: Iterable[Dict[str, Any]],
) -> Tuple[List[UpdateOne], Set[str]]:
    ops: List[UpdateOne] = []
    taxids: Set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        op = annotation_row_to_bulk_op(row)
        if op is not None:
            ops.append(op)
            tid = row.get("taxid")
            if tid is not None:
                taxids.add(str(tid))
    return ops, taxids


def fetch_annotation_rows_for_accessions(
    accessions: Iterable[Any],
    session: Optional[requests.Session] = None,
) -> List[Dict[str, Any]]:
    """
    All Annotrieve annotation dicts for the given assembly accessions (batched HTTP).
    """
    accs = dedupe_assembly_accessions(accessions)
    if not accs:
        return []

    close_session = False
    if session is None:
        session = requests.Session()
        close_session = True
    try:
        out: List[Dict[str, Any]] = []
        for batch in create_batches(accs, ACCESSION_BATCH):
            out.extend(
                fetch_annotations_for_assembly_accessions(session, list(batch))
            )
        return out
    finally:
        if close_session and session is not None:
            session.close()


def upsert_genome_annotations_from_rows(
    rows: Iterable[Dict[str, Any]],
) -> Tuple[int, Set[str]]:
    """
    Bulk upsert from API rows. Returns (number of bulk ops executed, taxids on valid rows).
    """
    ops, taxids = annotation_rows_to_bulk_ops(rows)
    if not ops:
        return 0, taxids

    coll = GenomeAnnotation._get_collection()
    total = 0
    for i in range(0, len(ops), BULK_CHUNK):
        chunk = ops[i : i + BULK_CHUNK]
        coll.bulk_write(chunk, ordered=False)
        total += len(chunk)
    return total, taxids


def finalize_after_annotrieve_upsert(taxids: Set[str]) -> None:
    """Refresh species denorm for taxids touched by annotation upserts (GoaT when configured)."""
    if not taxids:
        return
    finalize_touched_species_catalog(
        sorted(taxids),
        copy_lineages=False,
        apply_goat_inference=bool(GOAT_PROJECT_NAME),
    )


def run_annotrieve_import_for_accessions(accessions: Iterable[Any]) -> Dict[str, Any]:
    """
    Fetch from Annotrieve, upsert ``GenomeAnnotation``, finalize touched species.

    Returns a summary dict suitable as a Celery task result.
    """
    accs = dedupe_assembly_accessions(accessions)
    if not accs:
        return {
            "status": "no_accessions",
            "annotations_upserted": 0,
            "assembly_accessions": 0,
            "assembly_accession_batches": 0,
            "taxids_synced": 0,
        }

    batches = list(create_batches(accs, ACCESSION_BATCH))
    with requests.Session() as session:
        rows = fetch_annotation_rows_for_accessions(accs, session=session)

    total_ops, taxids_touched = upsert_genome_annotations_from_rows(rows)
    finalize_after_annotrieve_upsert(taxids_touched)

    logger.info(
        "Annotrieve import for %s accessions: %s upserts, %s taxids finalized",
        len(accs),
        total_ops,
        len(taxids_touched),
    )
    return {
        "status": "ok",
        "assembly_accession_batches": len(batches),
        "assembly_accessions": len(accs),
        "annotations_upserted": total_ops,
        "taxids_synced": len(taxids_touched),
    }
