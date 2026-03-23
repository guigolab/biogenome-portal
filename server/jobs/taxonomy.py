from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Dict, Optional

from celery import shared_task
from pymongo import UpdateOne

from helpers.rest_catalog_sync import cascade_delete_organism
from jobs.support.organism_catalog_sync import finalize_organism_catalog_for_taxids
from jobs.support.taxonomy_refresh import run_taxonomy_refresh
from db.model import (
    Organism,
    TaxonNode,
)
from helpers import taxonomy as taxonomy_helper
from helpers.data import create_batches

logger = logging.getLogger(__name__)

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


@shared_task(name="helpers_backfill_taxon_parents", ignore_result=False)
def backfill_taxon_parents_and_refresh_counts(
    refresh_all_counts: bool = True,
):
    """
    Backfill TaxonNode.parent (parent taxid) for nodes where it is missing, using the
    inverse of the `children` edges already stored on taxon documents.

    Then refreshes denormalized TaxonNode resource counts via
    ``update_taxon_node_counts_for_taxids``.

    :param refresh_all_counts: If True (default), recompute counts for every taxon node.
        If False, only nodes that received a new parent are refreshed.
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

