"""
Parse ENA read_run filereport TSV and insert new ``ReadRun`` documents (Celery reads import).
Existing runs are skipped; only new ones are inserted.
"""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Set

from pymongo import UpdateOne

from db.model import Organism, ReadRun
from helpers.data import create_batches
from parsers.read import parse_read_from_ena_portal

logger = logging.getLogger(__name__)


@dataclass
class ReadRunTsvIngestStats:
    rows_skipped: int = 0
    inserted: int = 0
    updated: int = 0


def insert_readrun_batch(docs: List[ReadRun]) -> List[str]:
    """
    Insert a batch of ReadRun documents; on bulk failure, retry per document.
    Returns ``run_accession`` values successfully inserted.
    """
    if not docs:
        return []
    saved: List[str] = []
    try:
        ReadRun.objects.insert(docs)
        saved.extend(r.run_accession for r in docs)
    except Exception:
        logger.exception(
            "Batch insert of %s read runs failed; retrying one-by-one", len(docs)
        )
        for r in docs:
            try:
                r.save()
                saved.append(r.run_accession)
            except Exception:
                logger.exception(
                    "Failed to insert read run %s", getattr(r, "run_accession", "?")
                )
    return saved


def backfill_readrun_taxon_lineage_from_organisms(
    run_accessions: Optional[Iterable[str]],
    *,
    batch_size: int = 2000,
) -> int:
    """
    Copy ``Organism.taxon_lineage`` onto each ``ReadRun`` in the import batch, keyed by
    ``run_accession``.

    Generic taxid-scoped ``UpdateOne`` updates can miss runs (legacy BSON ``taxid`` type,
    timing, etc.); this pass aligns each inserted/updated run with its organism explicitly.
    """
    if not run_accessions:
        return 0
    ids = list(dict.fromkeys(str(x) for x in run_accessions if x))
    if not ids:
        return 0

    coll = ReadRun._get_collection()
    n_updated = 0
    for batch in create_batches(ids, batch_size):
        runs = list(
            ReadRun.objects(run_accession__in=batch).only("run_accession", "taxid")
        )
        if not runs:
            continue

        taxids: Set[str] = set()
        for r in runs:
            if r.taxid is None:
                continue
            s = str(r.taxid).strip()
            if s:
                taxids.add(s)

        if not taxids:
            continue

        org_by: Dict[str, Organism] = {}
        for o in Organism.objects(taxid__in=list(taxids)).only("taxid", "taxon_lineage"):
            org_by[str(o.taxid).strip()] = o

        ops: List[UpdateOne] = []
        for r in runs:
            acc = r.run_accession
            if not acc:
                continue
            tid = str(r.taxid).strip() if r.taxid is not None else ""
            if not tid:
                continue
            org = org_by.get(tid)
            if not org or not org.taxon_lineage:
                continue
            lineage = [str(x) for x in org.taxon_lineage if x is not None]
            ops.append(
                UpdateOne({"run_accession": acc}, {"$set": {"taxon_lineage": lineage}})
            )

        if ops:
            coll.bulk_write(ops, ordered=False)
            n_updated += len(ops)

    if n_updated:
        logger.info(
            "Copied organism taxon_lineage onto %s ReadRun document(s) in this batch",
            n_updated,
        )
    return n_updated


def _process_batch(
    batch_by_accession: Dict[str, ReadRun],
    *,
    write_chunk_size: int = 5000,
) -> tuple[List[str], int]:
    """
    For a batch of (accession -> ReadRun), query which exist, insert new ones via MongoEngine.
    Existing runs are skipped. Returns (new_accessions, n_inserted).
    """
    accessions = list(batch_by_accession.keys())
    if not accessions:
        return [], 0

    existing = set(
        ReadRun.objects(run_accession__in=accessions).scalar("run_accession")
    )

    to_insert: List[ReadRun] = [
        doc for acc, doc in batch_by_accession.items() if acc not in existing
    ]

    new_accessions: List[str] = []
    n_inserted = 0

    for chunk in create_batches(to_insert, write_chunk_size):
        saved = insert_readrun_batch(chunk)
        new_accessions.extend(saved)
        n_inserted += len(saved)

    return new_accessions, n_inserted


def ingest_readruns_from_ena_tsv(
    path: str,
    *,
    batch_size: int = 5000,
) -> tuple[List[str], ReadRunTsvIngestStats]:
    """
    Read a tab-separated ENA filereport file: insert new ``ReadRun`` docs only.
    Existing runs are skipped (no metadata updates).

    Processes in batches without loading all existing accessions into memory (scales to
    millions of existing reads). Uses MongoEngine batch insert.
    """
    stats = ReadRunTsvIngestStats()
    new_read_accessions: List[str] = []

    # Batch rows by accession (last occurrence wins for duplicates)
    batch_by_accession: Dict[str, ReadRun] = {}

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row_index, read_run in enumerate(reader, start=2):
            try:
                read_to_save = parse_read_from_ena_portal(read_run)
            except Exception:
                stats.rows_skipped += 1
                logger.exception(
                    "Skipping invalid filereport row (line ~%s)", row_index
                )
                continue

            if not read_to_save.run_accession:
                stats.rows_skipped += 1
                logger.warning(
                    "Skipping row without run_accession (line ~%s)", row_index
                )
                continue

            batch_by_accession[read_to_save.run_accession] = read_to_save

            if len(batch_by_accession) >= batch_size:
                new_accs, n_ins = _process_batch(batch_by_accession)
                new_read_accessions.extend(new_accs)
                stats.inserted += n_ins
                batch_by_accession.clear()

    if batch_by_accession:
        new_accs, n_ins = _process_batch(batch_by_accession)
        new_read_accessions.extend(new_accs)
        stats.inserted += n_ins

    return new_read_accessions, stats
