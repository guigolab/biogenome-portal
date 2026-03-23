"""
Import genome annotations from Annotrieve (CRG) into ``GenomeAnnotation``.

Uses :mod:`clients.annotrieve_client` for HTTP; see that module for API URLs and env vars.
"""

from __future__ import annotations

import datetime
import logging
import os
from typing import Any, Dict, List, Optional, Set

import requests
from celery import shared_task
from pymongo import UpdateOne

from clients.annotrieve_client import fetch_annotations_for_assembly_accessions, file_url
from db.model import Assembly, GenomeAnnotation
from helpers.data import create_batches
from jobs.support.organism_catalog_sync import finalize_organism_catalog_for_taxids

logger = logging.getLogger(__name__)

# Accessions per POST body (tune down if upstream times out).
_ACCESSION_BATCH = int(os.getenv("ANNOTRIEVE_ACCESSION_BATCH", "200"))
# Mongo bulk_write chunk size.
_BULK_CHUNK = 500


def _annotation_to_bulk_op(row: Dict[str, Any]) -> Optional[UpdateOne]:
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


def _collect_assembly_accessions() -> List[str]:
    raw = Assembly.objects.scalar("accession")
    out: List[str] = []
    seen: Set[str] = set()
    for a in raw:
        if a is None:
            continue
        s = str(a).strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


@shared_task(name="annotations_import_from_annotrieve", ignore_result=False)
def import_annotations_from_annotrieve() -> Dict[str, Any]:
    """
    Pipeline phases:
    1) primary model (GenomeAnnotation upsert from Annotrieve),
    4) related updates (finalize species counts/status with no lineage copy).

    For each assembly accession in the catalog, pull matching annotations from Annotrieve
    and upsert ``GenomeAnnotation`` (name = ``annotation_id``, full payload in ``metadata``).
    """
    accessions = _collect_assembly_accessions()
    if not accessions:
        logger.info("annotrieve import: no assemblies in DB; nothing to do.")
        return {"status": "no_assemblies", "annotations_upserted": 0, "assembly_accessions": 0}

    taxids_touched: Set[str] = set()
    total_ops = 0
    batches = list(create_batches(accessions, _ACCESSION_BATCH))

    with requests.Session() as session:
        for bi, batch in enumerate(batches):
            logger.info(
                "Annotrieve: accession batch %s/%s (size %s)",
                bi + 1,
                len(batches),
                len(batch),
            )
            rows = fetch_annotations_for_assembly_accessions(session, list(batch))
            ops: List[UpdateOne] = []
            for row in rows:
                op = _annotation_to_bulk_op(row)
                if op is not None:
                    ops.append(op)
                    tid = row.get("taxid")
                    if tid is not None:
                        taxids_touched.add(str(tid))

            coll = GenomeAnnotation._get_collection()
            for i in range(0, len(ops), _BULK_CHUNK):
                chunk = ops[i : i + _BULK_CHUNK]
                if chunk:
                    coll.bulk_write(chunk, ordered=False)
                    total_ops += len(chunk)

    if taxids_touched:
        finalize_organism_catalog_for_taxids(
            sorted(taxids_touched),
            copy_lineages=False,
            apply_goat_inference=False,
        )

    logger.info(
        "Annotrieve import finished: %s upserts, %s distinct taxids synced",
        total_ops,
        len(taxids_touched),
    )
    return {
        "status": "ok",
        "assembly_accession_batches": len(batches),
        "assembly_accessions": len(accessions),
        "annotations_upserted": total_ops,
        "taxids_synced": len(taxids_touched),
    }
