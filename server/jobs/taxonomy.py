from __future__ import annotations

import logging
import os
import tempfile
from typing import Any, Dict, Optional

from celery import shared_task
from pymongo import UpdateOne

from db.model import (
    Assembly,
    BioSample,
    Chromosome,
    GenomeAnnotation,
    Organism,
    ReadRun,
    TaxonNode,
)

logger = logging.getLogger(__name__)

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


@shared_task(name="helpers_unset_taxon_node_legacy_fields", ignore_result=False)
def unset_taxon_node_legacy_fields():
    """
    Two-phase TaxonNode maintenance:

    1. ``$unset`` legacy TaxonNode fields:
       - ``leaves`` (superseded by aggregate counts / ``organisms_count`` in API logic).
       - ``submitted_biosamples_count`` (legacy denormalized counter).
    2. Backfill ``TaxonNode.parent`` (and ``children``) edges from every
       ``Organism.taxon_lineage`` chain via
       :func:`~jobs.support.catalog_denorm_finalize.sync_taxonnode_edges_from_organism_lineages`.
       Placeholder TaxonNode rows are inserted for lineage taxids missing from the DB
       (``rank="other"``); a taxonomy refresh fills their real name/rank later.

    Only touches the ``TaxonNode`` collection (not e.g. BioProject ``leaves`` or
    catalog ``taxon_lineage`` mirrors on BioSample / Assembly / ReadRun).
    """
    unset_stats = _unset_taxon_node_legacy_fields_bulk()
    backfill_stats = _backfill_taxon_node_parent_edges_from_organisms()
    return {**unset_stats, **backfill_stats}


def _unset_taxon_node_legacy_fields_bulk() -> Dict[str, int]:
    """``$unset`` ``leaves`` / ``submitted_biosamples_count`` from every TaxonNode that has them."""
    coll = TaxonNode._get_collection()
    matched = coll.count_documents(_TAXON_NODE_HAS_LEGACY_FIELD_QUERY)
    if matched == 0:
        logger.info(
            "TaxonNode: no documents with `leaves` or `submitted_biosamples_count`; nothing to unset"
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


def _backfill_taxon_node_parent_edges_from_organisms() -> Dict[str, int]:
    """
    Set ``TaxonNode.parent`` and ``children`` from every ``Organism.taxon_lineage`` chain.

    Reuses :func:`~jobs.support.catalog_denorm_finalize.sync_taxonnode_edges_from_organism_lineages`
    so edges are written the same way as in the ingest / taxonomy refresh pipelines.
    """
    from helpers import taxonomy as taxonomy_helper
    from jobs.support.catalog_denorm_finalize import (
        sync_taxonnode_edges_from_organism_lineages,
    )

    coll = TaxonNode._get_collection()
    parent_missing_before = coll.count_documents({"parent": {"$exists": False}})

    orgs = list(
        Organism.objects().only("taxid", "taxon_lineage", "scientific_name")
    )
    if not orgs:
        logger.info(
            "TaxonNode: no Organism documents in db; skipping parent edge backfill"
        )
        return {
            "organisms_scanned": 0,
            "taxon_nodes_inserted_for_lineage": 0,
            "lineage_taxids_resolved": 0,
            "parent_missing_before": parent_missing_before,
            "parent_missing_after": parent_missing_before,
        }

    n_ensured = taxonomy_helper.ensure_taxon_nodes_for_organisms_lineages(orgs)
    if n_ensured:
        logger.info(
            "TaxonNode: inserted %d placeholder row(s) for lineage taxids missing in db",
            n_ensured,
        )

    all_lineage_taxids: set = set()
    for o in orgs:
        if o.taxon_lineage:
            all_lineage_taxids.update(
                str(x) for x in o.taxon_lineage if x is not None
            )

    taxon_map = taxonomy_helper.taxon_node_map_for_taxids(all_lineage_taxids)
    sync_taxonnode_edges_from_organism_lineages(orgs, taxon_map)

    parent_missing_after = coll.count_documents({"parent": {"$exists": False}})
    logger.info(
        "TaxonNode: parent backfill done (scanned %d organism(s), resolved %d lineage taxid(s)); "
        "documents without parent: %d -> %d",
        len(orgs),
        len(taxon_map),
        parent_missing_before,
        parent_missing_after,
    )
    return {
        "organisms_scanned": len(orgs),
        "taxon_nodes_inserted_for_lineage": n_ensured,
        "lineage_taxids_resolved": len(taxon_map),
        "parent_missing_before": parent_missing_before,
        "parent_missing_after": parent_missing_after,
    }


@shared_task(name="helpers_refresh_taxonomy", ignore_result=False)
def refresh_taxonomy_recurrent(tmp_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Re-fetch taxonomy from ENA for all organisms and taxon nodes, detect drift from INSDC,
    then align stored data and catalog mirrors.

    Pipeline (implemented in :func:`jobs.support.taxonomy_refresh.execute_taxonomy_refresh_pipeline`):

    1. Collect species taxids plus lineage taxids from organisms and TaxonNode documents; fetch ENA.
    2. Compare each organism's ``scientific_name``, ``taxid``, and ``taxon_lineage`` to ENA.
    3. On change: update ``Organism`` and ``update_many`` related catalog rows (assemblies,
       biosamples, read runs, genome annotations, local samples, sample coordinates) for
       ``taxid`` / ``scientific_name`` / ``taxon_lineage``.
    4. Prune organisms missing lineage; insert missing TaxonNode rows; apply ENA ``name`` /
       ``rank`` updates on existing nodes; rebuild ``parent`` / ``children`` from organism lineages
       (preferring ENA taxon payloads over stale DB copies when both exist).
    5. :func:`~jobs.support.stats.update_organism_counts` and
       :func:`~jobs.support.stats.update_taxon_node_counts` for catalog counters on touched
       species (no INSDC/GoaT status refresh).
    """
    if tmp_dir is None:
        tmp_dir = os.getenv("TMP_DIR", tempfile.gettempdir())

    from jobs.support.taxonomy_refresh import execute_taxonomy_refresh_pipeline

    return execute_taxonomy_refresh_pipeline(tmp_dir)


@shared_task(name="helpers_cleanup_catalog_outside_root_lineage", ignore_result=False)
def cleanup_catalog_outside_root_lineage() -> Dict[str, Any]:
    """
    Delete catalog rows whose ``taxon_lineage`` does not contain ``ROOT_NODE``.

    Models cleaned:
    - ``Assembly`` (also deletes related ``Chromosome`` rows)
    - ``ReadRun``
    - ``BioSample``
    - ``Organism``
    - ``GenomeAnnotation``
    """
    root_node = (os.getenv("ROOT_NODE") or "").strip()
    if not root_node:
        raise ValueError("ROOT_NODE env variable is required")

    lineage_filter = {"taxon_lineage__nin": [root_node]}

    assembly_docs = list(Assembly.objects(**lineage_filter).only("accession", "chromosomes"))
    deleted_assembly_count = len(assembly_docs)

    chromosome_versions = sorted(
        {
            version.strip()
            for assembly in assembly_docs
            for version in (assembly.chromosomes or [])
            if version and version.strip()
        }
    )
    assembly_accessions = sorted(
        {
            accession.strip()
            for assembly in assembly_docs
            for accession in [assembly.accession]
            if accession and accession.strip()
        }
    )

    if deleted_assembly_count:
        Assembly.objects(id__in=[assembly.id for assembly in assembly_docs]).delete()

    deleted_chromosomes_by_version = 0
    if chromosome_versions:
        deleted_chromosomes_by_version = Chromosome.objects(
            accession_version__in=chromosome_versions
        ).delete()
    deleted_chromosomes_by_accession = 0
    if assembly_accessions:
        deleted_chromosomes_by_accession = Chromosome.objects(
            metadata__assembly_accession__in=assembly_accessions
        ).delete()

    deleted_reads_count = ReadRun.objects(**lineage_filter).delete()
    deleted_biosamples_count = BioSample.objects(**lineage_filter).delete()
    deleted_organisms_count = Organism.objects(**lineage_filter).delete()
    deleted_annotations_count = GenomeAnnotation.objects(**lineage_filter).delete()

    result = {
        "root_node": root_node,
        "assemblies_deleted": deleted_assembly_count,
        "chromosomes_deleted_by_version": deleted_chromosomes_by_version,
        "chromosomes_deleted_by_accession": deleted_chromosomes_by_accession,
        "reads_deleted": deleted_reads_count,
        "biosamples_deleted": deleted_biosamples_count,
        "organisms_deleted": deleted_organisms_count,
        "annotations_deleted": deleted_annotations_count,
    }
    logger.info("Catalog cleanup outside root lineage completed: %s", result)
    return result
