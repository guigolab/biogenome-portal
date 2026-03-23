"""
Recurrent taxonomy update: re-fetch from ENA, detect changes, update organisms
and related catalog models, refresh TaxonNode edges and counts.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, Set, Tuple, Union

from pymongo import UpdateMany, UpdateOne

from db.model import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    SampleCoordinates,
    TaxonNode,
)
from helpers.data import create_batches
from jobs.support.organism_catalog_finalize import (
    bulk_update_taxon_node_counts_for_keys,
    finalize_organism_catalog_for_taxids,
)
from jobs.support.organism_catalog_guard import TAXID_LIST_LIMIT
from jobs.support.organism_catalog_taxonomy import (
    _insert_new_taxon_nodes_from_dict,
    fetch_new_organisms,
)

logger = logging.getLogger(__name__)

ChangeType = Literal["scientific_name", "taxid", "both", "lineage_only"]
_LINEAGE_BULK_CHUNK = 1000
DEFAULT_CHUNK = 3000


def _taxid_variants_for_filter(tid: str) -> List[Union[str, int]]:
    """Values for $in matching catalog docs with string or int taxid."""
    s = str(tid).strip() if tid is not None else ""
    if not s:
        return [s]
    out: List[Union[str, int]] = [s]
    if s.isdigit():
        try:
            out.append(int(s))
        except ValueError:
            pass
    return out


def _catalog_taxid_filter(tid: str) -> Dict[str, Any]:
    tid = str(tid).strip()
    if not tid:
        return {"taxid": tid}
    variants = _taxid_variants_for_filter(tid)
    if len(variants) == 1:
        return {"taxid": tid}
    return {"taxid": {"$in": variants}}


def _chunked_bulk_write(
    collection: Any, ops: List[Any], batch_size: int = _LINEAGE_BULK_CHUNK
) -> None:
    if not ops:
        return
    for i in range(0, len(ops), batch_size):
        collection.bulk_write(ops[i : i + batch_size], ordered=False)


@dataclass
class OrganismChange:
    """Represents a detected change between DB organism and fresh ENA data."""

    db_org: Organism
    fresh_org: Organism
    change_type: ChangeType


def collect_taxids_for_refresh() -> Tuple[List[str], Set[str]]:
    """
    Collect all taxids that need to be re-fetched: species (organism) taxids
    and lineage taxids from organisms and TaxonNodes.

    Returns (species_taxids, lineage_taxids).
    """
    species_taxids = [
        str(t)
        for t in Organism.objects().scalar("taxid")
        if t is not None and str(t).strip()
    ]
    lineage_taxids: Set[str] = set()

    for org in Organism.objects().only("taxon_lineage"):
        if org.taxon_lineage:
            lineage_taxids.update(str(x) for x in org.taxon_lineage if x is not None)

    for t in TaxonNode.objects().scalar("taxid"):
        if t is not None:
            lineage_taxids.add(str(t))

    return species_taxids, lineage_taxids


def fetch_fresh_taxonomy_from_ena(
    taxids: List[str],
    tmp_dir: str,
) -> Tuple[List[Organism], Dict[str, Any]]:
    """
    Fetch fresh taxonomy data from ENA for the given taxids.

    Returns (organisms, taxons_dict) where organisms are fresh Organism-like docs
    and taxons_dict is taxid -> TaxonNode.
    """
    organisms: List[Organism] = []
    taxons_dict: Dict[str, Any] = {}
    batches = create_batches(taxids, TAXID_LIST_LIMIT)
    for idx, batch in enumerate(batches):
        orgs, taxons = fetch_new_organisms(batch, tmp_dir)
        organisms.extend(orgs)
        taxons_dict.update(taxons)
    return organisms, taxons_dict


def compute_organism_changes(
    db_organisms: List[Organism],
    fresh_organisms: List[Organism],
) -> List[OrganismChange]:
    """
    Compare DB organisms with fresh ENA data and compute changes.

    Matching: primary by taxid, fallback by scientific_name (for deprecated taxids).
    """
    fresh_by_taxid: Dict[str, Organism] = {}
    fresh_by_scientific_name: Dict[str, Organism] = {}
    for org in fresh_organisms:
        tid = str(org.taxid).strip() if org.taxid else ""
        if tid:
            fresh_by_taxid[tid] = org
        name = (org.scientific_name or "").strip()
        if name:
            fresh_by_scientific_name[name.lower()] = org

    changes: List[OrganismChange] = []
    for db_org in db_organisms:
        old_tid = str(db_org.taxid).strip() if db_org.taxid else ""
        old_name = (db_org.scientific_name or "").strip()
        if not old_tid:
            continue

        fresh = fresh_by_taxid.get(old_tid)
        if fresh is None:
            fresh = (
                fresh_by_scientific_name.get(old_name.lower())
                if old_name
                else None
            )
            if fresh is None:
                logger.warning(
                    "Taxid %s (scientific_name=%s) not found in ENA response; skipping",
                    old_tid,
                    old_name,
                )
                continue
            change_type: ChangeType = "taxid" if str(fresh.taxid).strip() != old_tid else "lineage_only"
        else:
            new_tid = str(fresh.taxid).strip()
            new_name = (fresh.scientific_name or "").strip()
            tid_changed = new_tid != old_tid
            name_changed = new_name != old_name
            lineage_changed = (
                (db_org.taxon_lineage or []) != (fresh.taxon_lineage or [])
            )
            if tid_changed and name_changed:
                change_type = "both"
            elif tid_changed:
                change_type = "taxid"
            elif name_changed:
                change_type = "scientific_name"
            elif lineage_changed:
                change_type = "lineage_only"
            else:
                continue

        changes.append(OrganismChange(db_org=db_org, fresh_org=fresh, change_type=change_type))

    return changes


def propagate_organism_changes_to_related(
    changes: List[OrganismChange],
) -> None:
    """
    Propagate organism changes to Assembly, BioSample, LocalSample, ReadRun,
    GenomeAnnotation, and SampleCoordinates.
    """
    catalog_models_with_lineage = [
        (Assembly._get_collection(), "taxon_lineage"),
        (BioSample._get_collection(), "taxon_lineage"),
        (LocalSample._get_collection(), "taxon_lineage"),
        (ReadRun._get_collection(), "taxon_lineage"),
        (GenomeAnnotation._get_collection(), "taxon_lineage"),
    ]
    sample_coords = SampleCoordinates._get_collection()

    for change in changes:
        old_tid = str(change.db_org.taxid).strip()
        new_tid = str(change.fresh_org.taxid).strip()
        new_name = (change.fresh_org.scientific_name or "").strip()
        lineage_list = list(change.fresh_org.taxon_lineage or [])

        if change.change_type in ("taxid", "both"):
            flt = _catalog_taxid_filter(old_tid)
            set_payload = {
                "taxid": new_tid,
                "scientific_name": new_name,
                "taxon_lineage": lineage_list,
            }
            set_payload_coords = {
                "taxid": new_tid,
                "scientific_name": new_name,
                "lineage": lineage_list,
            }
        else:
            flt = _catalog_taxid_filter(new_tid)
            set_payload = {
                "scientific_name": new_name,
                "taxon_lineage": lineage_list,
            }
            set_payload_coords = {
                "scientific_name": new_name,
                "lineage": lineage_list,
            }

        for coll, _ in catalog_models_with_lineage:
            coll.update_many(flt, {"$set": set_payload})
        sample_coords.update_many(flt, {"$set": set_payload_coords})


def apply_organism_updates(changes: List[OrganismChange]) -> None:
    """
    Update Organism documents and propagate to related catalog models.

    When taxid changes, we update related models first (by old taxid), then
    update the Organism document.
    """
    if not changes:
        return

    org_coll = Organism._get_collection()

    propagate_organism_changes_to_related(changes)

    for change in changes:
        fresh = change.fresh_org
        old_tid = str(change.db_org.taxid).strip()
        new_tid = str(fresh.taxid).strip()
        new_name = (fresh.scientific_name or "").strip()
        lineage_list = list(fresh.taxon_lineage or [])
        insdc_common_name = (fresh.insdc_common_name or "").strip() or None

        if change.change_type in ("taxid", "both"):
            org_coll.update_one(
                _catalog_taxid_filter(old_tid),
                {
                    "$set": {
                        "taxid": new_tid,
                        "scientific_name": new_name,
                        "taxon_lineage": lineage_list,
                        "insdc_common_name": insdc_common_name,
                    }
                },
            )
        else:
            org_coll.update_one(
                {"taxid": new_tid},
                {
                    "$set": {
                        "scientific_name": new_name,
                        "taxon_lineage": lineage_list,
                        "insdc_common_name": insdc_common_name,
                    }
                },
            )


def rebuild_taxon_node_edges_and_counts(
    fresh_taxons_dict: Dict[str, Any],
    updated_organism_taxids: List[str],
) -> None:
    """
    Rebuild TaxonNode parent/children from organism lineages and refresh counts.
    Inserts any new TaxonNodes from fresh data before updating edges.
    """
    if not updated_organism_taxids:
        return

    _insert_new_taxon_nodes_from_dict(fresh_taxons_dict)

    orgs = list(
        Organism.objects(taxid__in=updated_organism_taxids).only(
            "taxid", "taxon_lineage"
        )
    )
    if not orgs:
        return

    taxon_map = dict(fresh_taxons_dict)
    all_lineage_taxids: Set[str] = set()
    for o in orgs:
        if o.taxon_lineage:
            all_lineage_taxids.update(str(x) for x in o.taxon_lineage if x)
    if all_lineage_taxids:
        existing = {
            str(n.taxid): n
            for n in TaxonNode.objects(taxid__in=list(all_lineage_taxids))
        }
        taxon_map.update(existing)

    from jobs.support.organism_catalog_finalize import (
        _bulk_update_taxonnode_edges_from_organism_lineages,
    )

    _bulk_update_taxonnode_edges_from_organism_lineages(
        orgs,
        taxon_map,
    )

    keys: Set[str] = set(updated_organism_taxids)
    for o in orgs:
        keys.add(str(o.taxid))
        if o.taxon_lineage:
            keys.update(str(x) for x in o.taxon_lineage if x)
    bulk_update_taxon_node_counts_for_keys(
        sorted(keys),
        chunk_size=DEFAULT_CHUNK,
    )


def run_taxonomy_refresh(tmp_dir: str) -> Dict[str, Any]:
    """
    Main orchestration: collect taxids, fetch fresh data, compute changes,
    apply updates, rebuild taxon edges/counts, finalize.
    """
    species_taxids, lineage_taxids = collect_taxids_for_refresh()
    all_taxids = sorted(set(species_taxids) | lineage_taxids)
    if not all_taxids:
        return {
            "organisms_updated": 0,
            "taxids_changed": 0,
            "species_fetched": 0,
        }

    db_organisms = list(
        Organism.objects(taxid__in=species_taxids).only(
            "taxid", "scientific_name", "taxon_lineage"
        )
    )
    fresh_organisms, fresh_taxons = fetch_fresh_taxonomy_from_ena(
        all_taxids, tmp_dir
    )

    changes = compute_organism_changes(db_organisms, fresh_organisms)
    organisms_updated = len(changes)
    taxids_changed = sum(
        1
        for c in changes
        if c.change_type in ("taxid", "both")
    )

    if changes:
        apply_organism_updates(changes)
        updated_taxids = [
            str(c.fresh_org.taxid)
            for c in changes
            if c.fresh_org.taxid
        ]
        rebuild_taxon_node_edges_and_counts(fresh_taxons, updated_taxids)
        finalize_organism_catalog_for_taxids(
            updated_taxids,
            copy_lineages=False,
            chunk_size=DEFAULT_CHUNK,
        )

    logger.info(
        "Taxonomy refresh: %d organism(s) updated, %d taxid change(s)",
        organisms_updated,
        taxids_changed,
    )
    return {
        "organisms_updated": organisms_updated,
        "taxids_changed": taxids_changed,
        "species_fetched": len(species_taxids),
    }
