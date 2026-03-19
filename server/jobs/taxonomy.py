import json
import logging
import os

from celery import shared_task
from pymongo import UpdateOne

from db.models import (
    Assembly,
    BioSample,
    ReadRun,
    LocalSample,
    Organism,
    SampleCoordinates,
    TaxonNode,
)
from helpers import taxonomy as taxonomy_helper
from helpers.data import create_batches

logger = logging.getLogger(__name__)

ROOT_NODE = os.getenv("ROOT_NODE")

# Batch bulk_write / count refreshes to bound memory and BSON op size.
PARENT_BACKFILL_BULK_SIZE = int(os.getenv("TAXON_PARENT_BACKFILL_BULK", "1000"))
COUNTS_REFRESH_BATCH = int(os.getenv("TAXON_COUNTS_REFRESH_BATCH", "3000"))
UNSET_LEAVES_BULK_SIZE = int(os.getenv("TAXON_UNSET_LEAVES_BULK", "2000"))

@shared_task(name='helpers_handle_orphans', ignore_result=False)
def handle_orphan_organisms():
    orphans = Organism.objects(insdc_status=None)
    for orphan in orphans:
        orphan.save()
        if not orphan.insdc_status:
            orphan.delete()

@shared_task(name='helpers_add_lineage', ignore_result=False)
def add_lineage():
    organism = None
    coordinates = SampleCoordinates.objects()
    for coord in coordinates:
        taxid = coord.taxid
        if not organism or organism.taxid != taxid:
            organism = Organism.objects(taxid=taxid).first()
            if not organism: 
                continue
        coord.update(lineage=organism.taxon_lineage)
    for model in [Assembly, ReadRun, BioSample, LocalSample]:
        objects = model.objects()
        for obj in objects:
            taxid = obj.taxid
            if not organism or organism.taxid != taxid:
                organism = Organism.objects(taxid=taxid).first()
                if not organism: 
                    continue
            obj.update(taxon_lineage=organism.taxon_lineage)


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


@shared_task(name="helpers_backfill_taxon_parents", ignore_result=False)
def backfill_taxon_parents_and_refresh_counts(
    refresh_all_counts: bool = True,
):
    """
    Backfill TaxonNode.parent (parent taxid) for nodes where it is missing, using the
    inverse of the `children` edges already stored on taxon documents.

    Then refreshes TaxonNode.leaves and denormalized resource counts via
    bulk_refresh_taxon_node_leaves / update_taxon_node_counts_for_taxids.

    :param refresh_all_counts: If True (default), recompute leaves + counts for every
        taxon node. If False, only nodes that received a new parent are refreshed.
    """
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
            "parents_backfilled": len(updated_taxids),
            "counts_refreshed": 0,
            "refresh_scope": "all" if refresh_all_counts else "updated",
        }

    refreshed = 0
    for batch in create_batches(to_refresh, COUNTS_REFRESH_BATCH):
        taxonomy_helper.bulk_refresh_taxon_node_leaves(batch, chunk_size=COUNTS_REFRESH_BATCH)
        taxonomy_helper.update_taxon_node_counts_for_taxids(
            batch, chunk_size=COUNTS_REFRESH_BATCH
        )
        refreshed += len(batch)

    logger.info(
        "Refreshed leaves and counts for %d taxon id(s) (scope=%s)",
        refreshed,
        "all" if refresh_all_counts else "updated",
    )

    return {
        "parents_backfilled": len(updated_taxids),
        "counts_refreshed": refreshed,
        "refresh_scope": "all" if refresh_all_counts else "updated",
    }


@shared_task(name="helpers_unset_taxon_node_leaves", ignore_result=False)
def unset_taxon_node_leaves_field():
    """
    Remove the legacy `leaves` field from TaxonNode documents (MongoDB $unset).

    Use after the API and refresh logic rely on `organisms_count` instead of `leaves`.
    Does not touch other collections (e.g. BioProject also has a `leaves` field).
    """
    coll = TaxonNode._get_collection()
    remaining = coll.count_documents({"leaves": {"$exists": True}})
    if remaining == 0:
        logger.info("TaxonNode: no documents with `leaves`; nothing to do")
        return {"unset_batches": 0, "documents_updated": 0, "had_leaves": 0}

    batches = 0
    documents_updated = 0
    cursor = coll.find(
        {"leaves": {"$exists": True}},
        {"_id": 1},
        batch_size=UNSET_LEAVES_BULK_SIZE,
    )
    ops: list = []
    for doc in cursor:
        ops.append(UpdateOne({"_id": doc["_id"]}, {"$unset": {"leaves": ""}}))
        if len(ops) >= UNSET_LEAVES_BULK_SIZE:
            coll.bulk_write(ops, ordered=False)
            documents_updated += len(ops)
            batches += 1
            ops.clear()
            logger.info(
                "TaxonNode: unset `leaves` batch %d (%d document(s) this run so far)",
                batches,
                documents_updated,
            )
    if ops:
        coll.bulk_write(ops, ordered=False)
        documents_updated += len(ops)
        batches += 1

    still = coll.count_documents({"leaves": {"$exists": True}})
    logger.info(
        "TaxonNode: finished unsetting `leaves` (%d batch(es), %d update(s)); %d still had field (should be 0)",
        batches,
        documents_updated,
        still,
    )
    return {
        "unset_batches": batches,
        "documents_updated": documents_updated,
        "had_leaves": remaining,
        "remaining_with_leaves": still,
    }

