"""
Parse ENA read_run filereport TSV and insert new ``ReadRun`` documents (Celery reads import).
Existing runs are skipped; only new ones are inserted.
"""

from __future__ import annotations

import csv
import logging
from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional, Set, Union

from pymongo import DeleteOne, UpdateOne

from clients.ncbi_sra_run import fetch_sra_run_metadata_by_run_accession
from db.model import BioSample, Organism, ReadRun
from helpers.data import create_batches
from parsers.read import (
    READRUN_TAXID_PENDING,
    parse_read_from_ena_portal,
    readrun_taxid_is_pending,
    scientific_name_is_placeholder,
)

logger = logging.getLogger(__name__)


@dataclass
class ReadRunTsvIngestStats:
    """Counters for TSV ingest; ``rows_skipped`` includes parse errors and unusable rows."""

    rows_skipped: int = 0
    inserted: int = 0
    updated: int = 0
    ncbi_fallback_filled: int = 0
    rows_skipped_after_ncbi: int = 0


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


def backfill_readrun_scientific_name_from_organisms(
    run_accessions: Optional[Iterable[str]],
    *,
    batch_size: int = 2000,
) -> int:
    """
    Set ``ReadRun.scientific_name`` from ``Organism.scientific_name`` when the run still
    has a placeholder label (empty or ``unknown``), e.g. ENA filereport omitted the name.
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
            ReadRun.objects(run_accession__in=batch).only(
                "run_accession", "taxid", "scientific_name"
            )
        )
        if not runs:
            continue

        taxids: Set[str] = set()
        for r in runs:
            if r.taxid is None:
                continue
            s = str(r.taxid).strip()
            if s and s != READRUN_TAXID_PENDING:
                taxids.add(s)

        if not taxids:
            continue

        org_by: Dict[str, Organism] = {}
        for o in Organism.objects(taxid__in=list(taxids)).only("taxid", "scientific_name"):
            org_by[str(o.taxid).strip()] = o

        ops: List[UpdateOne] = []
        for r in runs:
            acc = r.run_accession
            if not acc:
                continue
            if not scientific_name_is_placeholder(getattr(r, "scientific_name", None)):
                continue
            tid = str(r.taxid).strip() if r.taxid is not None else ""
            if not tid or readrun_taxid_is_pending(tid):
                continue
            org = org_by.get(tid)
            if not org:
                continue
            sn = (org.scientific_name or "").strip()
            if not sn:
                continue
            ops.append(
                UpdateOne({"run_accession": acc}, {"$set": {"scientific_name": sn}})
            )

        if ops:
            coll.bulk_write(ops, ordered=False)
            n_updated += len(ops)

    if n_updated:
        logger.info(
            "Backfilled scientific_name from Organism on %s ReadRun document(s)",
            n_updated,
        )
    return n_updated


def apply_readrun_taxonomy_from_biosamples_for_accessions(
    run_accessions: Optional[Iterable[str]],
    *,
    batch_size: int = 2000,
) -> Dict[str, int]:
    """
    After ``resolve_biosamples_for_accessions``: set each ReadRun's ``taxid`` and
    ``scientific_name`` from the matching ``BioSample`` (by ``sample_accession``).

    Deletes ReadRuns when the sample accession is missing, no BioSample row exists after
    resolution, or the linked BioSample lacks taxid/name. Chunked for low memory use.
    """
    counts = {"updated": 0, "deleted": 0}
    if not run_accessions:
        return counts
    ids = list(dict.fromkeys(str(x) for x in run_accessions if x))
    if not ids:
        return counts

    coll = ReadRun._get_collection()
    for batch in create_batches(ids, batch_size):
        runs = list(
            ReadRun.objects(run_accession__in=batch).only(
                "run_accession", "sample_accession", "taxid"
            )
        )
        if not runs:
            continue

        sample_accs: Set[str] = set()
        for r in runs:
            sa = (getattr(r, "sample_accession", None) or "").strip()
            if sa:
                sample_accs.add(sa)

        bio_by: Dict[str, BioSample] = {}
        if sample_accs:
            for b in BioSample.objects(accession__in=list(sample_accs)).only(
                "accession", "taxid", "scientific_name"
            ):
                if b.accession:
                    bio_by[str(b.accession).strip()] = b

        ops: List[Union[UpdateOne, DeleteOne]] = []
        batch_updated = 0
        batch_deleted = 0
        for r in runs:
            acc = r.run_accession
            if not acc:
                continue
            sa = (getattr(r, "sample_accession", None) or "").strip()
            if not sa:
                ops.append(DeleteOne({"run_accession": acc}))
                batch_deleted += 1
                continue
            bio = bio_by.get(sa)
            if not bio:
                ops.append(DeleteOne({"run_accession": acc}))
                batch_deleted += 1
                continue
            tid = (bio.taxid or "").strip()
            sn = (bio.scientific_name or "").strip()
            if not tid or not sn:
                ops.append(DeleteOne({"run_accession": acc}))
                batch_deleted += 1
                continue
            ops.append(
                UpdateOne(
                    {"run_accession": acc},
                    {"$set": {"taxid": tid, "scientific_name": sn}},
                )
            )
            batch_updated += 1

        if ops:
            coll.bulk_write(ops, ordered=False)
            counts["updated"] += batch_updated
            counts["deleted"] += batch_deleted

    if counts["updated"] or counts["deleted"]:
        logger.info(
            "ReadRun taxonomy from BioSample: updated=%s deleted=%s",
            counts["updated"],
            counts["deleted"],
        )
    return counts


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

    Rows without ``run_accession`` are skipped. Rows without a BioSample accession after
    ENA parsing (including ``secondary_sample_accession``) may be filled from NCBI SRA
    metadata; if still missing, they are skipped (counted in ``rows_skipped`` and
    ``rows_skipped_after_ncbi``). Rows without ``tax_id`` use a pending sentinel until
    biosample resolution (see :data:`parsers.read.READRUN_TAXID_PENDING`).

    Processes in batches without loading all existing accessions into memory (scales to
    millions of existing reads). Uses MongoEngine batch insert.
    """
    stats = ReadRunTsvIngestStats()
    new_read_accessions: List[str] = []

    # Batch rows by accession (last occurrence wins for duplicates)
    batch_by_accession: Dict[str, ReadRun] = {}
    ncbi_cache: Dict[str, Optional[Dict[str, str]]] = {}
    ncbi_fallback_counted: Set[str] = set()

    with open(path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter="\t")
        for row_index, read_run in enumerate(reader, start=2):
            try:
                read_to_save = parse_read_from_ena_portal(read_run)
            except Exception:
                stats.rows_skipped += 1
                logger.exception(
                    "Skipping invalid filereport row (line ~%s): %s",
                    row_index,
                    read_run,
                )
                continue

            if not read_to_save.run_accession:
                stats.rows_skipped += 1
                logger.warning(
                    "Skipping row without run_accession (line ~%s)", row_index
                )
                continue

            if not (read_to_save.sample_accession or "").strip():
                ra = (read_to_save.run_accession or "").strip()
                if ra not in ncbi_cache:
                    ncbi_cache[ra] = fetch_sra_run_metadata_by_run_accession(ra)
                ncbi = ncbi_cache[ra]
                if ncbi:
                    read_to_save.sample_accession = (ncbi.get("sample_accession") or "").strip()
                    if read_to_save.taxid == READRUN_TAXID_PENDING and (
                        ncbi.get("tax_id") or ""
                    ).strip():
                        read_to_save.taxid = str(ncbi["tax_id"]).strip()
                    if scientific_name_is_placeholder(
                        getattr(read_to_save, "scientific_name", None)
                    ) and (ncbi.get("scientific_name") or "").strip():
                        read_to_save.scientific_name = str(
                            ncbi["scientific_name"]
                        ).strip()
                    md = dict(read_to_save.metadata or {})
                    md["ncbi_sra_fallback"] = True
                    read_to_save.metadata = md
                    if ra not in ncbi_fallback_counted:
                        ncbi_fallback_counted.add(ra)
                        stats.ncbi_fallback_filled += 1
                        logger.info(
                            "Filled sample_accession from NCBI SRA for run %s → %s",
                            ra,
                            read_to_save.sample_accession,
                        )
                if not (read_to_save.sample_accession or "").strip():
                    stats.rows_skipped += 1
                    stats.rows_skipped_after_ncbi += 1
                    logger.warning(
                        "Skipping row without sample_accession after NCBI fallback "
                        "(line ~%s, run %s)",
                        row_index,
                        ra,
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
