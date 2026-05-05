"""
Annotrieve fetch, ``GenomeAnnotation`` upsert, and sync with portal organism lineages.

Core upsert/finalize helpers are used by :func:`run_annotrieve_import_for_accessions` and
:func:`sync_annotrieve_annotations_for_assembly_accessions` (and tests / Celery).

:func:`sync_annotrieve_annotations_for_assembly_accessions` composes upsert with
:func:`jobs.support.taxonomy.copy_organism_taxon_lineage_to_catalog_for_genome_annotation_names`
so ``GenomeAnnotation.taxon_lineage`` matches the portal ``Organism`` lineage after upsert.
"""

from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

import requests
from pymongo import UpdateOne

from clients.annotrieve_client import fetch_annotations_for_assembly_accessions, file_url
from db.model import GenomeAnnotation
from helpers.data import create_batches
from jobs.support.stats import update_organism_counts, update_taxon_node_counts
from jobs.support.taxonomy import copy_organism_taxon_lineage_to_catalog_for_genome_annotation_names

logger = logging.getLogger(__name__)

ACCESSION_BATCH = 200
BULK_CHUNK = 500


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

def _genome_annotation_names_from_rows(rows: List[Dict[str, Any]]) -> List[str]:
    """
    ``GenomeAnnotation.name`` values (Annotrieve ``annotation_id``) for rows that pass
    the same validation as the bulk upsert.
    """
    out: List[str] = []
    seen: Set[str] = set()
    for row in rows:
        if not isinstance(row, dict):
            continue
        if annotation_row_to_bulk_op(row) is None:
            continue
        raw_id = row.get("annotation_id")
        if raw_id is None:
            continue
        name = str(raw_id).strip()
        if not name or name in seen:
            continue
        seen.add(name)
        out.append(name)
    return out


def sync_annotrieve_annotations_for_assembly_accessions(
    assembly_accessions: Iterable[Any],
    *,
    skip_finalize: bool = False,
) -> List[str]:
    """
    Fetch Annotrieve annotations for the given assembly accessions, upsert
    :class:`~db.model.GenomeAnnotation` documents, copy ``taxon_lineage`` from each species
    :class:`~db.model.Organism`, and optionally run the usual species catalog finalize.

    Returns the ``name`` field of each saved annotation (Annotrieve annotation id), in
    first-seen order, excluding duplicates.

    When ``skip_finalize`` is True (e.g. assembly import merges taxids into one catalog
    finalize), callers must run :func:`jobs.support.stats.update_organism_counts` and
    :func:`jobs.support.stats.update_taxon_node_counts` for the touched species taxids (same as
    the non-``skip_finalize`` branch below).
    """
    accs = dedupe_assembly_accessions(assembly_accessions)
    if not accs:
        return []

    saved_names: List[str] = []
    total_ops = 0
    taxids_touched: Set[str] = set()

    with requests.Session() as session:
        for http_batch in create_batches(accs, ACCESSION_BATCH):
            batch = list(http_batch)
            if not batch:
                continue
            rows = fetch_annotations_for_assembly_accessions(session, batch)
            names_batch = _genome_annotation_names_from_rows(rows)
            ops_b, tids_b = upsert_genome_annotations_from_rows(rows)
            total_ops += ops_b
            taxids_touched |= tids_b
            if names_batch:
                copy_organism_taxon_lineage_to_catalog_for_genome_annotation_names(
                    names_batch
                )
            saved_names.extend(names_batch)

    if not skip_finalize and taxids_touched:
        update_organism_counts(list(taxids_touched))
        update_taxon_node_counts(list(taxids_touched))

    deduped_names = list(dict.fromkeys(saved_names))

    logger.info(
        "Annotrieve sync for %s assembly accessions: %s row ops, %s annotation name(s), "
        "%s taxid(s) %s",
        len(accs),
        total_ops,
        len(deduped_names),
        len(taxids_touched),
        "finalize skipped" if skip_finalize else "finalized",
    )

    return deduped_names
