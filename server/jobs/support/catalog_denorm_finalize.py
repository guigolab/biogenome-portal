"""
Catalog denormalization: propagate organism lineages to catalog rows and TaxonNode edges.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Iterable, List, Set, Union

from pymongo import UpdateMany, UpdateOne

from db.model import (
    Assembly,
    BioSample,
    Organism,
    ReadRun,
    TaxonNode,
    GenomeAnnotation,
)
from helpers import taxonomy as taxonomy_helper

logger = logging.getLogger(__name__)

_LINEAGE_BULK_CHUNK = 1000


def _catalog_taxid_filter(tid: str) -> Dict[str, Any]:
    """Filter by species ``taxid`` (stored as string on catalog documents)."""
    tid = str(tid).strip()
    return {"taxid": tid}


def _chunked_bulk_write(
    collection: Any, ops: List[Any], batch_size: int = _LINEAGE_BULK_CHUNK
) -> None:
    if not ops:
        return
    for i in range(0, len(ops), batch_size):
        collection.bulk_write(ops[i : i + batch_size], ordered=False)


def sync_taxonnode_edges_from_organism_lineages(
    organisms: List[Organism],
    taxon_map: Dict[str, Any],
) -> None:
    """
    Update TaxonNode ``parent`` and ``children`` edges from Organism lineage chains.
    """
    node_ops: List[UpdateOne] = []
    seen_parent_child: Set[tuple[str, str]] = set()
    seen_child_parent: Set[tuple[str, str]] = set()

    for organism in organisms:
        lineage = organism.taxon_lineage or []
        ordered = [taxon_map[str(t)] for t in lineage if str(t) in taxon_map]
        if len(ordered) < 2:
            continue
        for i in range(len(ordered) - 1):
            child = ordered[i]
            parent = ordered[i + 1]
            child_tid = str(child.taxid)
            parent_tid = str(parent.taxid)
            if (parent_tid, child_tid) not in seen_parent_child:
                seen_parent_child.add((parent_tid, child_tid))
                node_ops.append(
                    UpdateOne({"taxid": parent_tid}, {"$addToSet": {"children": child_tid}})
                )
            if (child_tid, parent_tid) not in seen_child_parent:
                seen_child_parent.add((child_tid, parent_tid))
                node_ops.append(
                    UpdateOne({"taxid": child_tid}, {"$set": {"parent": parent_tid}})
                )

    if node_ops:
        _chunked_bulk_write(TaxonNode._get_collection(), node_ops)


def _bulk_set_catalog_taxon_lineage_for_species(organisms: List[Organism]) -> None:
    """
    Write ``taxon_lineage`` to BioSample, Assembly, and ReadRun documents by taxid.

    Uses ``UpdateMany``: there are typically multiple catalog rows per species ``taxid``
    (e.g. several assemblies); ``UpdateOne`` would only fix the first match per taxid.
    """
    bio_ops: List[UpdateMany] = []
    asm_ops: List[UpdateMany] = []
    read_ops: List[UpdateMany] = []
    ann_ops: List[UpdateMany] = []

    for organism in organisms:
        tid = str(organism.taxid)
        lineage_list = list(organism.taxon_lineage) if organism.taxon_lineage else []
        flt = _catalog_taxid_filter(tid)
        bio_ops.append(UpdateMany(flt, {"$set": {"taxon_lineage": lineage_list}}))
        asm_ops.append(UpdateMany(flt, {"$set": {"taxon_lineage": lineage_list}}))
        read_ops.append(UpdateMany(flt, {"$set": {"taxon_lineage": lineage_list}}))
        ann_ops.append(UpdateMany(flt, {"$set": {"taxon_lineage": lineage_list}}))

    _chunked_bulk_write(BioSample._get_collection(), bio_ops)
    _chunked_bulk_write(Assembly._get_collection(), asm_ops)
    _chunked_bulk_write(ReadRun._get_collection(), read_ops)
    _chunked_bulk_write(GenomeAnnotation._get_collection(), ann_ops)


def bulk_copy_organism_lineages_to_catalog(
    species_taxids: Iterable[Union[str, int]],
) -> None:
    """
    Set TaxonNode parent/children from organism lineages; copy ``Organism.taxon_lineage``
    onto BioSample, Assembly, ReadRun for each species taxid.
    """
    unique_taxids = sorted({str(t) for t in species_taxids if t is not None})
    if not unique_taxids:
        return

    orgs = list(
        Organism.objects(taxid__in=unique_taxids).only(
            "taxid", "taxon_lineage", "scientific_name"
        )
    )
    if not orgs:
        return

    n_ensured = taxonomy_helper.ensure_taxon_nodes_for_organisms_lineages(orgs)
    if n_ensured:
        logger.info(
            "Inserted %d TaxonNode row(s) so organism lineages are fully linkable "
            "(placeholders use rank=other until taxonomy refresh)",
            n_ensured,
        )

    all_lineage_taxids: Set[str] = set()
    for o in orgs:
        if o.taxon_lineage:
            all_lineage_taxids.update(str(x) for x in o.taxon_lineage if x is not None)

    taxon_map = taxonomy_helper.taxon_node_map_for_taxids(all_lineage_taxids)

    sync_taxonnode_edges_from_organism_lineages(orgs, taxon_map)
    _bulk_set_catalog_taxon_lineage_for_species(orgs)
