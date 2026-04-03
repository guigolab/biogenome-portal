from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

from celery import chain, shared_task
from pymongo import UpdateOne

from helpers.rest_catalog_sync import cascade_delete_organism
from jobs.support.organism_catalog_finalize import bulk_copy_organism_lineages_to_catalog
from jobs.support.organism_catalog_sync import finalize_organism_catalog_for_taxids
from jobs.support.taxonomy_refresh import run_taxonomy_refresh
from db.model import (
    Organism,
    TaxonNode,
)
from helpers import taxonomy as taxonomy_helper
from helpers.data import create_batches

logger = logging.getLogger(__name__)

# Organism lineage_rank_labels backfill: batch size for bulk_write.
ORGANISM_LINEAGE_LABELS_BATCH = int(os.getenv("ORGANISM_LINEAGE_LABELS_BATCH", "400"))

# Map TaxonNode.rank (lowercase) -> OrganismLineageRankLabels field name in MongoDB.
_LINEAGE_RANK_TO_LABEL_KEY = {
    "kingdom": "kingdom",
    "phylum": "phylum",
    "class": "class_name",
    "order": "order",
    "family": "family",
    "genus": "genus",
}


def _organism_taxid_query_values(taxids: List[Any]) -> List[Any]:
    """BSON values for ``$in`` on ``Organism.taxid`` (string + int when numeric)."""
    out: List[Any] = []
    seen_str: set[str] = set()
    seen_int: set[int] = set()
    for raw in taxids:
        if raw is None:
            continue
        s = str(raw).strip()
        if not s or s in seen_str:
            continue
        seen_str.add(s)
        out.append(s)
        if s.isdigit():
            try:
                n = int(s)
                if n not in seen_int:
                    seen_int.add(n)
                    out.append(n)
            except ValueError:
                pass
    return out


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
    batch_docs: list,
    org_coll,
    taxon_coll,
) -> tuple[int, int]:
    """
    Compute and write ``lineage_rank_labels`` for the given organism pymongo docs
    (must include ``taxon_lineage``). Returns (n_set, n_unset).
    """
    if not batch_docs:
        return 0, 0

    all_tids: set[str] = set()
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

    ops: list = []
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


ROOT_NODE = os.getenv("ROOT_NODE")

# Batch bulk_write / count refreshes to bound memory and BSON op size.
PARENT_BACKFILL_BULK_SIZE = int(os.getenv("TAXON_PARENT_BACKFILL_BULK", "1000"))
COUNTS_REFRESH_BATCH = int(os.getenv("TAXON_COUNTS_REFRESH_BATCH", "3000"))
# Batched $unset of legacy TaxonNode fields (also honors deprecated TAXON_UNSET_LEAVES_BULK).
UNSET_TAXON_LEGACY_FIELDS_BULK_SIZE = int(
    os.getenv(
        "TAXON_UNSET_LEGACY_FIELDS_BULK",
        os.getenv("TAXON_UNSET_LEAVES_BULK", "2000"),
    )
)

_TAXON_NODE_LEGACY_FIELDS_UNSET = {"leaves": "", "submitted_biosamples_count": ""}

_TAXON_NODE_HAS_LEGACY_FIELD_QUERY = {
    "$or": [
        {"leaves": {"$exists": True}},
        {"submitted_biosamples_count": {"$exists": True}},
    ],
}

@shared_task(name='helpers_handle_orphans', ignore_result=False)
def handle_orphan_organisms():
    orphans = list(Organism.objects(insdc_status=None))
    taxids = [str(o.taxid) for o in orphans if o.taxid]
    if taxids:
        finalize_organism_catalog_for_taxids(taxids, copy_lineages=False)
    for tid in taxids:
        org = Organism.objects(taxid=tid).first()
        if org and not org.insdc_status:
            cascade_delete_organism(org)

def _build_child_to_parent_taxid_map():
    """
    From each node's `children` list, infer parent taxid for every child.
    Returns dict child_taxid -> chosen parent_taxid (stable if multiple claim the same child).
    """
    coll = TaxonNode._get_collection()
    raw = {}
    for doc in coll.find({}, {"taxid": 1, "children": 1}):
        parent_tid = doc.get("taxid")
        if not parent_tid:
            continue
        for child_tid in doc.get("children") or []:
            if not child_tid:
                continue
            raw.setdefault(str(child_tid), []).append(str(parent_tid))

    resolved = {}
    for child_tid, parents in raw.items():
        uniq = list(dict.fromkeys(parents))
        if len(uniq) == 1:
            resolved[child_tid] = uniq[0]
        else:
            chosen = sorted(uniq)[0]
            logger.warning(
                "Multiple parents claim child taxid %s: %s; using %s",
                child_tid,
                uniq,
                chosen,
            )
            resolved[child_tid] = chosen
    return resolved


def _parent_field_is_empty(value) -> bool:
    return value is None or value == ""


# Batch size for inserting missing organism-mirror TaxonNode rows.
_ORGANISM_LEAF_TAXON_BATCH = int(os.getenv("ORGANISM_LEAF_TAXON_BATCH", "2000"))


def insert_missing_organism_leaf_taxon_nodes(
    batch_size: int | None = None,
) -> int:
    """
    Ensure each ``Organism`` has a matching ``TaxonNode`` at ``Organism.taxid`` (tree leaf).

    Bulk ENA ingest historically only inserted lineage ancestors, not the species/organism
    taxon itself, so the taxonomic tree stopped at genus. Inserts missing nodes using the
    organism scientific name and rank ``species`` when we have no finer rank from taxonomy.
    """
    bs = batch_size if batch_size is not None else _ORGANISM_LEAF_TAXON_BATCH
    if bs < 1:
        bs = _ORGANISM_LEAF_TAXON_BATCH

    all_taxids = [
        str(t).strip()
        for t in Organism.objects.scalar("taxid")
        if t is not None and str(t).strip()
    ]
    if not all_taxids:
        return 0

    inserted_total = 0
    for batch in create_batches(all_taxids, bs):
        existing = set(TaxonNode.objects(taxid__in=batch).scalar("taxid"))
        existing_norm = {str(x).strip() for x in existing if x is not None and str(x).strip()}
        missing = [t for t in batch if t not in existing_norm]
        if not missing:
            continue
        orgs = Organism.objects(taxid__in=missing).only("taxid", "scientific_name")
        new_nodes: list[TaxonNode] = []
        for org in orgs:
            tid = str(org.taxid).strip()
            if not tid:
                continue
            name = (org.scientific_name or "").strip() or tid
            new_nodes.append(TaxonNode(taxid=tid, name=name, rank="species"))
        if new_nodes:
            TaxonNode.objects.insert(new_nodes)
            inserted_total += len(new_nodes)

    return inserted_total


@shared_task(name="helpers_backfill_taxon_parents", ignore_result=False)
def backfill_taxon_parents_and_refresh_counts(
    refresh_all_counts: bool = True,
):
    """
    1) Insert missing ``TaxonNode`` rows for each ``Organism.taxid`` (species / organism leaf).
    2) Rebuild ``parent`` / ``children`` edges from ``Organism.taxon_lineage`` when any were
       inserted (and align catalog lineages).
    3) Backfill ``TaxonNode.parent`` where still empty, using inverse ``children`` lists.
    4) Refresh denormalized TaxonNode resource counts via ``update_taxon_node_counts_for_taxids``.

    :param refresh_all_counts: If True (default), recompute counts for every taxon node.
        If False, only nodes that received a new parent are refreshed.
    """
    organism_leaf_inserted = insert_missing_organism_leaf_taxon_nodes()
    if organism_leaf_inserted:
        logger.info(
            "Inserted %d organism mirror TaxonNode document(s) (species / leaf taxids)",
            organism_leaf_inserted,
        )
        all_org_taxids = [
            str(t).strip()
            for t in Organism.objects.scalar("taxid")
            if t is not None and str(t).strip()
        ]
        if all_org_taxids:
            bulk_copy_organism_lineages_to_catalog(all_org_taxids)

    child_to_parent = _build_child_to_parent_taxid_map()
    coll = TaxonNode._get_collection()

    ops: list = []
    updated_taxids: list[str] = []
    parents_of_updated: set[str] = set()

    for doc in coll.find({}, {"taxid": 1, "parent": 1}):
        tid = doc.get("taxid")
        if tid is None:
            continue
        tid = str(tid)
        if not _parent_field_is_empty(doc.get("parent")):
            continue
        parent_tid = child_to_parent.get(tid)
        if not parent_tid:
            continue

        ops.append(UpdateOne({"taxid": tid}, {"$set": {"parent": parent_tid}}))
        updated_taxids.append(tid)
        parents_of_updated.add(parent_tid)

        if len(ops) >= PARENT_BACKFILL_BULK_SIZE:
            coll.bulk_write(ops, ordered=False)
            ops.clear()

    if ops:
        coll.bulk_write(ops, ordered=False)

    logger.info(
        "Backfilled parent taxid on %d TaxonNode document(s)",
        len(updated_taxids),
    )

    if refresh_all_counts:
        all_ids: set[str] = set()
        for d in coll.find({}, {"taxid": 1}).batch_size(2000):
            t = d.get("taxid")
            if t:
                all_ids.add(str(t))
        to_refresh = sorted(all_ids)
    else:
        to_refresh = sorted(set(updated_taxids) | parents_of_updated)

    if not to_refresh:
        return {
            "organism_leaf_taxons_inserted": organism_leaf_inserted,
            "parents_backfilled": len(updated_taxids),
            "counts_refreshed": 0,
            "refresh_scope": "all" if refresh_all_counts else "updated",
        }

    refreshed = 0
    for batch in create_batches(to_refresh, COUNTS_REFRESH_BATCH):
        taxonomy_helper.update_taxon_node_counts_for_taxids(
            batch, chunk_size=COUNTS_REFRESH_BATCH
        )
        refreshed += len(batch)

    logger.info(
        "Refreshed TaxonNode counts for %d taxon id(s) (scope=%s)",
        refreshed,
        "all" if refresh_all_counts else "updated",
    )

    return {
        "organism_leaf_taxons_inserted": organism_leaf_inserted,
        "parents_backfilled": len(updated_taxids),
        "counts_refreshed": refreshed,
        "refresh_scope": "all" if refresh_all_counts else "updated",
    }


@shared_task(name="helpers_unset_taxon_node_legacy_fields", ignore_result=False)
def unset_taxon_node_legacy_fields():
    """
    Remove legacy TaxonNode fields via MongoDB ``$unset``:

    - ``leaves`` (superseded by aggregate counts / ``organisms_count`` in API logic).
    - ``submitted_biosamples_count`` (legacy denormalized counter).

    Only touches the ``TaxonNode`` collection (not e.g. BioProject ``leaves``).
    """
    coll = TaxonNode._get_collection()
    matched = coll.count_documents(_TAXON_NODE_HAS_LEGACY_FIELD_QUERY)
    if matched == 0:
        logger.info(
            "TaxonNode: no documents with `leaves` or `submitted_biosamples_count`; nothing to do"
        )
        return {
            "unset_batches": 0,
            "documents_updated": 0,
            "matched_initially": 0,
            "remaining_with_leaves": 0,
            "remaining_submitted_biosamples_count": 0,
        }

    batches = 0
    documents_updated = 0
    cursor = coll.find(
        _TAXON_NODE_HAS_LEGACY_FIELD_QUERY,
        {"_id": 1},
        batch_size=UNSET_TAXON_LEGACY_FIELDS_BULK_SIZE,
    )
    ops: list = []
    for doc in cursor:
        ops.append(
            UpdateOne({"_id": doc["_id"]}, {"$unset": _TAXON_NODE_LEGACY_FIELDS_UNSET})
        )
        if len(ops) >= UNSET_TAXON_LEGACY_FIELDS_BULK_SIZE:
            coll.bulk_write(ops, ordered=False)
            documents_updated += len(ops)
            batches += 1
            ops.clear()
            logger.info(
                "TaxonNode: unset legacy fields batch %d (%d document(s) this run so far)",
                batches,
                documents_updated,
            )
    if ops:
        coll.bulk_write(ops, ordered=False)
        documents_updated += len(ops)
        batches += 1

    still_leaves = coll.count_documents({"leaves": {"$exists": True}})
    still_submitted = coll.count_documents(
        {"submitted_biosamples_count": {"$exists": True}}
    )
    logger.info(
        "TaxonNode: finished unsetting legacy fields (%d batch(es), %d update(s)); "
        "remaining leaves=%d, submitted_biosamples_count=%d (both should be 0)",
        batches,
        documents_updated,
        still_leaves,
        still_submitted,
    )
    return {
        "unset_batches": batches,
        "documents_updated": documents_updated,
        "matched_initially": matched,
        "remaining_with_leaves": still_leaves,
        "remaining_submitted_biosamples_count": still_submitted,
    }


@shared_task(name="helpers_backfill_organism_lineage_rank_labels", ignore_result=False)
def backfill_organism_lineage_rank_labels():
    """
    Set ``Organism.lineage_rank_labels`` from :class:`~db.model.TaxonNode` name/rank
    for each taxid in ``taxon_lineage``. Uses PyMongo bulk writes.

    Documents with no resolvable labels get ``lineage_rank_labels`` unset.
    """
    org_coll = Organism._get_collection()
    taxon_coll = TaxonNode._get_collection()

    scanned = 0
    set_count = 0
    unset_count = 0
    batch_docs: list = []

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

    cursor = org_coll.find({}, {"taxon_lineage": 1}).batch_size(ORGANISM_LINEAGE_LABELS_BATCH)
    for doc in cursor:
        scanned += 1
        batch_docs.append(doc)
        if len(batch_docs) >= ORGANISM_LINEAGE_LABELS_BATCH:
            flush_batch()

    flush_batch()

    logger.info(
        "backfill_organism_lineage_rank_labels: scanned=%d set=%d unset=%d",
        scanned,
        set_count,
        unset_count,
    )
    return {
        "organisms_scanned": scanned,
        "lineage_rank_labels_set": set_count,
        "lineage_rank_labels_unset": unset_count,
    }


@shared_task(name="helpers_backfill_organism_lineage_rank_labels_for_taxids", ignore_result=False)
def backfill_organism_lineage_rank_labels_for_taxids(
    taxids: Optional[List[Any]] = None,
) -> Dict[str, Any]:
    """
    Like :func:`backfill_organism_lineage_rank_labels` but only for organisms whose
    ``taxid`` is in ``taxids``.
    """
    if not taxids:
        logger.info("backfill_organism_lineage_rank_labels_for_taxids: no taxids, skipping")
        return {"status": "skipped", "reason": "no_taxids"}

    vals = _organism_taxid_query_values(list(taxids))
    if not vals:
        return {"status": "skipped", "reason": "no_taxids"}

    org_coll = Organism._get_collection()
    taxon_coll = TaxonNode._get_collection()

    set_count = 0
    unset_count = 0
    scanned = 0
    batch_docs: list = []

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
        "backfill_organism_lineage_rank_labels_for_taxids: scanned=%s set=%s unset=%s",
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


@shared_task(name="helpers_enrich_organisms_post_taxonomy", ignore_result=False)
def enrich_organisms_post_taxonomy(
    taxids: Optional[List[Any]] = None,
    iucn_force: bool = False,
) -> Dict[str, Any]:
    """
    Queue sequential enrichment for newly relevant species taxids:

    1. IUCN Red List fetch
    2. ``lineage_rank_labels`` from :class:`~db.model.TaxonNode``
    3. External images when the organism has fewer than ``min_images`` (default 1)
    4. ToLID prefix resolution (last; rate-limited)

    Replaces firing ``organisms.fetch_tolid_prefixes`` alone after bulk imports.
    """
    if not taxids:
        logger.info("helpers_enrich_organisms_post_taxonomy: no taxids, skipping")
        return {"status": "skipped", "reason": "no_taxids"}

    tid_list = [str(t).strip() for t in taxids if t is not None and str(t).strip()]
    if not tid_list:
        return {"status": "skipped", "reason": "no_taxids"}

    from jobs.organism_images import fetch_external_images_task
    from jobs.organisms import fetch_iucn_redlist_task, fetch_tolid_prefixes_task

    n = len(tid_list)
    async_result = chain(
        fetch_iucn_redlist_task.si(tid_list, bool(iucn_force)),
        backfill_organism_lineage_rank_labels_for_taxids.si(tid_list),
        fetch_external_images_task.si(taxids=tid_list, min_images=1, max_organisms=n),
        fetch_tolid_prefixes_task.si(tid_list),
    ).apply_async()

    logger.info(
        "helpers_enrich_organisms_post_taxonomy: queued chain id=%s for %s taxids",
        async_result.id,
        n,
    )
    return {
        "status": "queued",
        "taxids": n,
        "chain_task_id": async_result.id,
        "steps": ["iucn_redlist", "lineage_rank_labels", "external_images", "tolid_prefixes"],
    }


@shared_task(name="helpers_refresh_taxonomy", ignore_result=False)
def refresh_taxonomy_recurrent(tmp_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Re-fetch taxonomy from ENA for all organisms and taxons, detect changes,
    update organisms and related models (Assembly, BioSample, LocalSample,
    ReadRun, GenomeAnnotation, SampleCoordinates), refresh TaxonNode
    relationships and counts.
    """
    if tmp_dir is None:
        tmp_dir = os.getenv("TMP_DIR", tempfile.gettempdir())
    return run_taxonomy_refresh(tmp_dir)

