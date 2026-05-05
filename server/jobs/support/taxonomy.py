from __future__ import annotations

import logging
import os
from typing import Any, Dict, Iterator, List, Optional, Set, Tuple

from pymongo import UpdateOne

from db.model import (
    GenomeAnnotation,
    Organism,
    TaxonNode,
)
from helpers import taxonomy as taxonomy_helper

logger = logging.getLogger(__name__)

_BATCH_IDS = 1000
_BATCH_TAXIDS = 1000

# Batched ``bulk_write`` for :class:`~db.model.Organism` ``lineage_rank_labels`` (env-tunable).
ORGANISM_LINEAGE_LABELS_BATCH = int(os.getenv("ORGANISM_LINEAGE_LABELS_BATCH", "400"))

# TaxonNode.rank (lowercase) -> OrganismLineageRankLabels field name.
_LINEAGE_RANK_TO_LABEL_KEY = {
    "kingdom": "kingdom",
    "phylum": "phylum",
    "class": "class_name",
    "order": "order",
    "family": "family",
    "genus": "genus",
}


def _dedupe_strip_ordered(values: List[str]) -> List[str]:
    out: List[str] = []
    seen: Set[str] = set()
    for raw in values:
        if raw is None:
            continue
        s = str(raw).strip()
        if not s or s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


def _strip_taxids_to_set(taxids: List[str]) -> Set[str]:
    out: Set[str] = set()
    for raw in taxids:
        if raw is None:
            continue
        t = str(raw).strip()
        if t:
            out.add(t)
    return out


def _chunks(items: List[str], size: int) -> Iterator[List[str]]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _lineage_list_from_organism(org: Organism) -> List[str]:
    if not org.taxon_lineage:
        return []
    return [str(x) for x in org.taxon_lineage if x is not None]


def _organism_map_for_taxids(taxids: Set[str]) -> Dict[str, Organism]:
    if not taxids:
        return {}
    out: Dict[str, Organism] = {}
    for chunk in _chunks(sorted(taxids), _BATCH_TAXIDS):
        for org in Organism.objects(taxid__in=chunk).only("taxid", "taxon_lineage"):
            if org.taxid is not None:
                out[str(org.taxid).strip()] = org
    return out


def copy_organism_taxon_lineage_to_catalog_for_genome_annotation_names(
    names: List[str],
) -> None:
    """Set ``GenomeAnnotation.taxon_lineage`` from the species Organism row."""
    clean = _dedupe_strip_ordered(names)
    if not clean:
        return

    for id_batch in _chunks(clean, _BATCH_IDS):
        rows = list(GenomeAnnotation.objects(name__in=id_batch).only("name", "taxid"))
        if not rows:
            continue
        taxids: Set[str] = set()
        for doc in rows:
            if doc.taxid is not None:
                t = str(doc.taxid).strip()
                if t:
                    taxids.add(t)
        org_map = _organism_map_for_taxids(taxids)
        for doc in rows:
            if doc.taxid is None:
                continue
            tid = str(doc.taxid).strip()
            org = org_map.get(tid)
            if org is None:
                continue
            lineage = _lineage_list_from_organism(org)
            GenomeAnnotation.objects(name=doc.name).update(set__taxon_lineage=lineage)


def _organism_taxid_query_values(taxids: List[Any]) -> List[str]:
    """Distinct stripped taxids for ``Organism.taxid`` (stored as string)."""
    chunk = [str(t).strip() for t in taxids if t is not None]
    return taxonomy_helper._taxid_match_values(chunk)


def _lineage_taxids_to_label_dict(lineage, tid_to_node: dict) -> dict:
    """
    Build a flat dict of lineage_rank_labels fields from taxon_lineage taxids.

    ``taxon_lineage`` is ordered from the organism taxon toward the root; the first
    node encountered for each rank wins.
    """
    out: Dict[str, str] = {}
    for raw in lineage or []:
        tid = str(raw).strip() if raw is not None else ""
        if not tid:
            continue
        node = tid_to_node.get(tid)
        if not node:
            continue
        name = (node.get("name") or "").strip()
        if not name:
            continue
        rank = (node.get("rank") or "").strip().lower()
        key = _LINEAGE_RANK_TO_LABEL_KEY.get(rank)
        if not key or key in out:
            continue
        out[key] = name
    return out


def _bulk_write_lineage_rank_labels_for_organism_docs(
    batch_docs: List[Any],
    org_coll,
    taxon_coll,
) -> Tuple[int, int]:
    """
    Compute and write ``lineage_rank_labels`` for the given organism pymongo docs
    (must include ``taxon_lineage``). Returns (n_set, n_unset).
    """
    if not batch_docs:
        return 0, 0

    all_tids: Set[str] = set()
    for d in batch_docs:
        for t in d.get("taxon_lineage") or []:
            if t is None:
                continue
            s = str(t).strip()
            if s:
                all_tids.add(s)

    tid_to_node: Dict[str, Dict[str, Any]] = {}
    tid_list = list(all_tids)
    for i in range(0, len(tid_list), 2000):
        chunk = tid_list[i : i + 2000]
        for doc in taxon_coll.find(
            {"taxid": {"$in": chunk}},
            {"taxid": 1, "name": 1, "rank": 1},
        ):
            tid = doc.get("taxid")
            if tid is not None:
                tid_to_node[str(tid)] = doc

    ops: List[UpdateOne] = []
    n_set = 0
    n_unset = 0
    for d in batch_docs:
        oid = d["_id"]
        labels = _lineage_taxids_to_label_dict(d.get("taxon_lineage"), tid_to_node)
        if labels:
            ops.append(UpdateOne({"_id": oid}, {"$set": {"lineage_rank_labels": labels}}))
            n_set += 1
        else:
            ops.append(UpdateOne({"_id": oid}, {"$unset": {"lineage_rank_labels": ""}}))
            n_unset += 1

    if ops:
        org_coll.bulk_write(ops, ordered=False)
    return n_set, n_unset


def sync_backfill_organism_lineage_rank_labels_for_taxids(
    taxids: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Like :func:`~jobs.organisms.backfill_organism_lineage_rank_labels` (full DB) but only
    for organisms whose ``taxid`` is in ``taxids``.
    """
    if not taxids:
        logger.info("sync_backfill_organism_lineage_rank_labels_for_taxids: no taxids, skipping")
        return {"status": "skipped", "reason": "no_taxids"}

    vals = _organism_taxid_query_values(list(taxids))
    if not vals:
        return {"status": "skipped", "reason": "no_taxids"}

    org_coll = Organism._get_collection()
    taxon_coll = TaxonNode._get_collection()

    set_count = 0
    unset_count = 0
    scanned = 0
    batch_docs: List[Any] = []

    def flush_batch():
        nonlocal batch_docs, set_count, unset_count
        if not batch_docs:
            return
        s, u = _bulk_write_lineage_rank_labels_for_organism_docs(
            batch_docs, org_coll, taxon_coll
        )
        set_count += s
        unset_count += u
        batch_docs = []

    cursor = org_coll.find(
        {"taxid": {"$in": vals}},
        {"taxon_lineage": 1},
    ).batch_size(ORGANISM_LINEAGE_LABELS_BATCH)
    for doc in cursor:
        scanned += 1
        batch_docs.append(doc)
        if len(batch_docs) >= ORGANISM_LINEAGE_LABELS_BATCH:
            flush_batch()
    flush_batch()

    logger.info(
        "sync_backfill_organism_lineage_rank_labels_for_taxids: scanned=%s set=%s unset=%s",
        scanned,
        set_count,
        unset_count,
    )
    return {
        "status": "ok",
        "organisms_scanned": scanned,
        "lineage_rank_labels_set": set_count,
        "lineage_rank_labels_unset": unset_count,
    }
