"""
Recurrent taxonomy update: re-fetch from ENA, detect changes, update organisms
and related catalog models, refresh TaxonNode edges and counts.

Hardening notes (see docs/celery-jobs and the taxonomy-refresh audit):

- Changes are guarded against MongoDB unique-index violations (``Organism.scientific_name``
  / ``taxid``) before being applied, instead of letting a ``DuplicateKeyError`` abort the
  whole run (see :func:`_guard_changes_against_unique_collisions`).
- Each change is applied in isolation (``Organism`` updated before its catalog mirrors, one
  change's failure does not stop the rest) - see :func:`apply_organism_updates`.
- Taxids missing from the bulk ENA response get a single-taxon provider retry before being
  treated as genuinely gone (see :func:`_fetch_single_taxon_fallback_for_unmatched`).
- TaxonNode ``children`` edges are corrected (not just added to) for every node touched by a
  lineage/taxid change, and counters are refreshed for both the old and new lineage (see
  :func:`_rebuild_children_for_touched_nodes` and :func:`rebuild_taxon_node_edges_for_organisms`).
- TaxonNode ``name``/``rank`` intrinsic sync from ENA runs unconditionally (not only when an
  organism-level change was detected), and ``lineage_rank_labels`` is refreshed for touched
  organisms.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Literal, Optional, Set, Tuple

from pymongo import UpdateOne

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
from helpers.organism import retrieve_taxonomic_info
from jobs.support.catalog_ingest_guard import (
    TAXID_LIST_LIMIT,
    prune_organisms_missing_taxon_lineage,
)
from jobs.support.catalog_taxonomy_bootstrap import (
    _insert_new_taxon_nodes_from_dict,
    fetch_new_organisms,
)
from jobs.support.stats import (
    refresh_taxon_node_counts_for_lineage_keys,
    update_organism_counts,
    update_taxon_node_counts,
)
from jobs.support.taxonomy import sync_backfill_organism_lineage_rank_labels_for_taxids

logger = logging.getLogger(__name__)

ChangeType = Literal["scientific_name", "taxid", "both", "lineage_only"]
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


def _rebuild_children_for_touched_nodes(touched_taxids: Set[str]) -> None:
    """
    Recompute the immediate ``children`` set for each given TaxonNode from scratch by
    scanning organisms whose ``taxon_lineage`` still contains it.

    ``sync_taxonnode_edges_from_organism_lineages`` (in ``catalog_denorm_finalize``) only
    ``$addToSet``s new edges derived from the (small) set of organisms just updated, so a
    child that moved to a different parent is never removed from its old parent's
    ``children``. This corrective pass fixes that for every node touched by this run's
    changes (old lineage ancestors that may have lost a descendant, and new lineage
    ancestors), using an indexed ``taxon_lineage`` query per touched node.
    """
    cleaned = {str(t).strip() for t in touched_taxids if t is not None and str(t).strip()}
    if not cleaned:
        return

    coll = TaxonNode._get_collection()
    ops: List[UpdateOne] = []
    for parent_tid in sorted(cleaned):
        children: Set[str] = set()
        for org in Organism.objects(taxon_lineage__in=[parent_tid]).only("taxon_lineage"):
            lineage = [str(x) for x in (org.taxon_lineage or []) if x is not None]
            try:
                idx = lineage.index(parent_tid)
            except ValueError:
                continue
            if idx > 0:
                children.add(lineage[idx - 1])
        ops.append(
            UpdateOne({"taxid": parent_tid}, {"$set": {"children": sorted(children)}})
        )
    _chunked_bulk_write(coll, ops)


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


def _fetch_single_taxon_fallback_for_unmatched(
    db_organisms: List[Organism],
    fresh_organisms: List[Organism],
    fresh_taxons: Dict[str, Any],
) -> Tuple[List[Organism], Dict[str, Any], Dict[str, int]]:
    """
    For DB organisms whose old ``taxid`` and ``scientific_name`` are both absent from the
    bulk ENA fetch, retry via the single-taxon provider chain (ENA browser -> ENA portal ->
    NCBI -> ENA Taxonomy REST; see :func:`helpers.organism.retrieve_taxonomic_info`) before
    treating them as genuinely gone from ENA.

    This distinguishes two situations that otherwise look identical to
    :func:`compute_organism_changes`: a transient bulk-fetch gap for that one taxid (common
    with ENA's browser bulk endpoint), versus a real deprecation. It does not, by itself,
    resolve a taxon that was *both* deprecated and renamed in the same ENA update with no
    trace left under the old taxid or old name - that residual case still requires manual
    review (surfaced via the "not found in ENA response" warning in
    :func:`compute_organism_changes`).

    Returns (augmented_fresh_organisms, augmented_fresh_taxons, stats) where stats has
    ``attempted`` / ``resolved`` / ``unresolved`` counts.
    """
    fresh_taxids = {
        str(o.taxid).strip() for o in fresh_organisms if o.taxid and str(o.taxid).strip()
    }
    fresh_names = {
        (o.scientific_name or "").strip().lower()
        for o in fresh_organisms
        if (o.scientific_name or "").strip()
    }

    unmatched_old_tids: List[str] = []
    seen: Set[str] = set()
    for db_org in db_organisms:
        old_tid = str(db_org.taxid).strip() if db_org.taxid else ""
        if not old_tid or old_tid in seen:
            continue
        if old_tid in fresh_taxids:
            continue
        old_name = (db_org.scientific_name or "").strip().lower()
        if old_name and old_name in fresh_names:
            continue
        seen.add(old_tid)
        unmatched_old_tids.append(old_tid)

    stats = {"attempted": len(unmatched_old_tids), "resolved": 0, "unresolved": 0}
    if not unmatched_old_tids:
        return fresh_organisms, fresh_taxons, stats

    logger.info(
        "Taxonomy refresh: %d taxid(s) missing from bulk ENA response; retrying via "
        "single-taxon providers: %s",
        len(unmatched_old_tids),
        unmatched_old_tids[:20],
    )

    augmented_organisms: List[Organism] = list(fresh_organisms)
    augmented_taxons: Dict[str, Any] = dict(fresh_taxons)

    for old_tid in unmatched_old_tids:
        try:
            organism_data, parsed_taxons = retrieve_taxonomic_info(old_tid)
        except Exception:
            logger.exception(
                "Taxonomy refresh: single-taxon fallback raised for taxid %s", old_tid
            )
            stats["unresolved"] += 1
            continue
        if not organism_data:
            logger.warning(
                "Taxonomy refresh: taxid %s not resolvable via any single-taxon provider "
                "(bulk ENA miss confirmed, not just transient)",
                old_tid,
            )
            stats["unresolved"] += 1
            continue

        augmented_organisms.append(organism_data)
        for taxon in parsed_taxons or []:
            tid = str(getattr(taxon, "taxid", "") or "").strip()
            if tid:
                augmented_taxons.setdefault(tid, taxon)
        stats["resolved"] += 1
        logger.info(
            "Taxonomy refresh: resolved taxid %s via single-taxon fallback (taxid now %s)",
            old_tid,
            str(organism_data.taxid).strip(),
        )

    return augmented_organisms, augmented_taxons, stats


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
            # By construction ``fresh_by_taxid.get(old_tid)`` above already failed, so no
            # fresh organism has ``taxid == old_tid``: the taxid always changed here. The
            # only open question is whether the name changed too (-> "both").
            new_tid = str(fresh.taxid).strip()
            new_name = (fresh.scientific_name or "").strip()
            tid_changed = new_tid != old_tid
            name_changed = new_name != old_name
            if tid_changed and name_changed:
                change_type: ChangeType = "both"
            elif tid_changed:
                change_type = "taxid"
            elif name_changed:
                change_type = "scientific_name"
            else:
                # Defensive: should not happen given the invariant above.
                continue
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


def _guard_changes_against_unique_collisions(
    changes: List[OrganismChange],
) -> Tuple[List[OrganismChange], Dict[str, int]]:
    """
    Prevent MongoDB unique-index violations (``Organism.scientific_name`` / ``taxid``, see
    ``server/db/model.py``) from raising ``DuplicateKeyError`` mid-batch and aborting the
    rest of the run:

    - Taxid collisions: if a change would remap ``taxid`` onto a value already owned by a
      *different* Organism (e.g. two species merged upstream), skip that change entirely -
      auto-merging two catalog subtrees is not safe to do here and needs manual review.
    - Name collisions: if a change's new ``scientific_name`` is already owned by a
      different, still-current organism (or claimed by another change in this same batch),
      disambiguate with the same ``" [NCBI:{taxid}]"`` suffix used at ingest time (see
      :func:`jobs.support.catalog_taxonomy_bootstrap._disambiguate_scientific_names_for_organism_bulk`).

    Returns (safe_changes, stats) with ``taxid_collisions_skipped`` /
    ``name_collisions_disambiguated`` counts.
    """
    if not changes:
        return changes, {"taxid_collisions_skipped": 0, "name_collisions_disambiguated": 0}

    org_coll = Organism._get_collection()

    # --- taxid collisions ---
    remap_new_tids = {
        str(c.fresh_org.taxid).strip()
        for c in changes
        if c.change_type in ("taxid", "both") and c.fresh_org.taxid
    }
    existing_owner_tids: Set[str] = set()
    if remap_new_tids:
        for doc in org_coll.find(
            {"taxid": {"$in": sorted(remap_new_tids)}}, {"taxid": 1}
        ):
            tid = str(doc.get("taxid", "")).strip()
            if tid:
                existing_owner_tids.add(tid)

    taxid_collisions_skipped = 0
    safe_changes: List[OrganismChange] = []
    for change in changes:
        if change.change_type in ("taxid", "both"):
            new_tid = str(change.fresh_org.taxid).strip()
            old_tid = str(change.db_org.taxid).strip()
            if new_tid != old_tid and new_tid in existing_owner_tids:
                logger.warning(
                    "Taxonomy refresh: skipping remap taxid %s -> %s; another organism "
                    "already owns taxid %s (possible upstream taxon merge; needs manual "
                    "review)",
                    old_tid,
                    new_tid,
                    new_tid,
                )
                taxid_collisions_skipped += 1
                continue
        safe_changes.append(change)

    # --- name collisions ---
    name_targets = {
        (c.fresh_org.scientific_name or "").strip()
        for c in safe_changes
        if (c.fresh_org.scientific_name or "").strip()
    }
    db_owners_by_lower: Dict[str, Set[str]] = {}
    if name_targets:
        for doc in org_coll.find(
            {"scientific_name": {"$in": sorted(name_targets)}},
            {"taxid": 1, "scientific_name": 1},
        ):
            label = (doc.get("scientific_name") or "").strip()
            if not label:
                continue
            db_owners_by_lower.setdefault(label.lower(), set()).add(
                str(doc.get("taxid", "")).strip()
            )

    name_collisions_disambiguated = 0
    claimed_lower: Dict[str, str] = {}
    for change in safe_changes:
        base = (change.fresh_org.scientific_name or "").strip()
        if not base:
            continue
        lower = base.lower()
        new_tid = str(change.fresh_org.taxid).strip()
        old_tid = str(change.db_org.taxid).strip()
        self_ids = {new_tid, old_tid}

        db_others = db_owners_by_lower.get(lower, set()) - self_ids
        peer_tid = claimed_lower.get(lower)
        if not db_others and (peer_tid is None or peer_tid in self_ids):
            claimed_lower[lower] = new_tid
            continue

        suffix = f" [NCBI:{new_tid}]"
        if suffix not in base:
            disambiguated = base + suffix
            logger.warning(
                "Taxonomy refresh: disambiguated scientific_name collision for taxid %s: "
                "%r already in use, using %r",
                new_tid,
                base,
                disambiguated,
            )
            change.fresh_org.scientific_name = disambiguated
            name_collisions_disambiguated += 1
        claimed_lower[lower] = new_tid

    return safe_changes, {
        "taxid_collisions_skipped": taxid_collisions_skipped,
        "name_collisions_disambiguated": name_collisions_disambiguated,
    }


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


def apply_organism_updates(changes: List[OrganismChange]) -> Dict[str, Any]:
    """
    Update Organism documents and propagate to related catalog models, one change at a
    time.

    ``Organism`` is updated *before* its catalog mirrors for each change, so it stays the
    authoritative source if propagation fails partway (and re-running the pipeline is
    idempotent: it will find ``Organism`` already updated and only the catalog rows still
    stale). Each change is applied in isolation so one failure (e.g. an unexpected
    unique-index violation not caught by :func:`_guard_changes_against_unique_collisions`,
    or a transient DB error) does not abort the rest of the batch.

    Returns ``{"applied": int, "failed": [{"old_taxid", "new_taxid", "change_type",
    "error"}, ...]}``.
    """
    if not changes:
        return {"applied": 0, "failed": []}

    org_coll = Organism._get_collection()
    applied = 0
    failed: List[Dict[str, Any]] = []

    for change in changes:
        fresh = change.fresh_org
        old_tid = str(change.db_org.taxid).strip()
        new_tid = str(fresh.taxid).strip()
        new_name = (fresh.scientific_name or "").strip()
        lineage_list = list(fresh.taxon_lineage or [])
        insdc_common_name = (fresh.insdc_common_name or "").strip() or None

        try:
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
            propagate_organism_changes_to_related([change])
            applied += 1
        except Exception as exc:
            logger.exception(
                "Taxonomy refresh: failed applying change taxid %s -> %s (%s)",
                old_tid,
                new_tid,
                change.change_type,
            )
            failed.append(
                {
                    "old_taxid": old_tid,
                    "new_taxid": new_tid,
                    "change_type": change.change_type,
                    "error": str(exc),
                }
            )

    return {"applied": applied, "failed": failed}


def apply_taxon_node_intrinsic_updates_from_ena(
    fresh_taxons_dict: Dict[str, Any],
    *,
    bulk_chunk: int = 500,
) -> int:
    """
    For TaxonNode rows already in the DB, set ``name`` and ``rank`` from ENA when they differ.

    New nodes are inserted by :func:`_insert_new_taxon_nodes_from_dict` with correct fields;
    this pass aligns existing rows with the latest INSDC payload. Runs unconditionally over
    every fetched taxon (not only ones tied to an organism-level change), so a pure
    higher-taxon rename/rank fix from ENA is not silently dropped.
    """
    if not fresh_taxons_dict:
        return 0

    coll = TaxonNode._get_collection()
    ops: List[UpdateOne] = []
    updated = 0

    def flush() -> None:
        nonlocal updated
        if not ops:
            return
        coll.bulk_write(ops, ordered=False)
        updated += len(ops)
        ops.clear()

    for tid_raw, fresh in fresh_taxons_dict.items():
        tid = str(tid_raw).strip()
        if not tid or fresh is None:
            continue
        fresh_name = (getattr(fresh, "name", None) or "").strip()
        fresh_rank = (getattr(fresh, "rank", None) or "").strip()
        doc = coll.find_one({"taxid": tid}, {"name": 1, "rank": 1})
        if not doc:
            continue
        db_name = (doc.get("name") or "").strip()
        db_rank = (doc.get("rank") or "").strip()
        if fresh_name == db_name and fresh_rank == db_rank:
            continue
        ops.append(
            UpdateOne(
                {"taxid": tid},
                {"$set": {"name": fresh_name, "rank": fresh_rank}},
            )
        )
        if len(ops) >= bulk_chunk:
            flush()
    flush()
    return updated


def rebuild_taxon_node_edges_for_organisms(
    fresh_taxons_dict: Dict[str, Any],
    updated_organism_taxids: List[str],
    *,
    old_lineage_taxids: Optional[Set[str]] = None,
) -> Set[str]:
    """
    Rebuild ``parent``/``children`` TaxonNode edges from the current (already-updated)
    lineages of ``updated_organism_taxids``, then correct ``children`` for every touched
    node (old lineage ancestors that may have lost a descendant, plus new lineage
    ancestors) so edges to children that moved to a different parent are removed, not just
    added to.

    Callers should recount catalog counters for the returned touched taxid set:
    :func:`~jobs.support.stats.update_taxon_node_counts` only walks the *new* organism
    lineages, so old-branch nodes need a separate
    :func:`~jobs.support.stats.refresh_taxon_node_counts_for_lineage_keys` call.

    Assumes new TaxonNode rows and intrinsic name/rank updates were already applied by the
    caller (see :func:`execute_taxonomy_refresh_pipeline`).

    Returns the touched TaxonNode taxid set (old lineage union new lineage).
    """
    touched_base = {str(t) for t in (old_lineage_taxids or set()) if t}

    if not updated_organism_taxids:
        return touched_base

    orgs = list(
        Organism.objects(taxid__in=updated_organism_taxids).only(
            "taxid", "taxon_lineage"
        )
    )
    if not orgs:
        return touched_base

    all_lineage_taxids: Set[str] = set()
    for o in orgs:
        if o.taxon_lineage:
            all_lineage_taxids.update(str(x) for x in o.taxon_lineage if x)

    taxon_map: Dict[str, Any] = {}
    for tid in all_lineage_taxids:
        if tid in fresh_taxons_dict:
            taxon_map[tid] = fresh_taxons_dict[tid]
    if all_lineage_taxids:
        existing = {
            str(n.taxid): n
            for n in TaxonNode.objects(taxid__in=list(all_lineage_taxids))
        }
        for tid, node in existing.items():
            if tid not in taxon_map:
                taxon_map[tid] = node

    from jobs.support.catalog_denorm_finalize import (
        sync_taxonnode_edges_from_organism_lineages,
    )

    sync_taxonnode_edges_from_organism_lineages(orgs, taxon_map)

    touched = touched_base | all_lineage_taxids
    _rebuild_children_for_touched_nodes(touched)
    return touched


def execute_taxonomy_refresh_pipeline(tmp_dir: str) -> Dict[str, Any]:
    """
    Main orchestration: collect taxids, fetch fresh data from ENA (with a per-taxid
    fallback for anything the bulk fetch missed), detect organism changes, guard against
    unique-index collisions, apply changes to Organism and mirror onto catalog rows (per
    change, Organism-first, isolated from other changes' failures), sync TaxonNode
    name/rank (unconditionally) and parent/children (correcting stale ``children`` edges),
    refresh ``lineage_rank_labels``, then refresh Organism and TaxonNode catalog counters
    for touched species - covering both the old and new lineage (no INSDC/GoaT status
    pass).

    Used by :func:`jobs.taxonomy.refresh_taxonomy_recurrent`.
    """
    species_taxids, lineage_taxids = collect_taxids_for_refresh()
    all_taxids = sorted(set(species_taxids) | lineage_taxids)
    if not all_taxids:
        return {
            "organisms_updated": 0,
            "taxids_changed": 0,
            "species_fetched": 0,
            "taxon_nodes_fields_updated": 0,
            "taxid_collisions_skipped": 0,
            "name_collisions_disambiguated": 0,
            "changes_failed": 0,
            "fallback_taxids_attempted": 0,
            "fallback_taxids_resolved": 0,
            "taxon_nodes_recounted": 0,
            "lineage_rank_labels_refreshed": 0,
        }

    db_organisms = list(
        Organism.objects(taxid__in=species_taxids).only(
            "taxid", "scientific_name", "taxon_lineage"
        )
    )
    fresh_organisms, fresh_taxons = fetch_fresh_taxonomy_from_ena(
        all_taxids, tmp_dir
    )
    fresh_organisms, fresh_taxons, fallback_stats = (
        _fetch_single_taxon_fallback_for_unmatched(
            db_organisms, fresh_organisms, fresh_taxons
        )
    )

    changes = compute_organism_changes(db_organisms, fresh_organisms)
    changes, collision_stats = _guard_changes_against_unique_collisions(changes)

    organisms_updated = 0
    taxids_changed = 0
    changes_failed = 0
    updated_taxids: List[str] = []
    old_lineage_taxids: Set[str] = set()

    if changes:
        old_lineage_taxids = {
            str(x)
            for c in changes
            for x in (c.db_org.taxon_lineage or [])
            if x is not None
        }

        apply_stats = apply_organism_updates(changes)
        organisms_updated = apply_stats["applied"]
        changes_failed = len(apply_stats["failed"])
        # Keyed by *old* taxid, not new: two changes can legitimately target the same new
        # taxid (e.g. two old species merged upstream into one), so filtering by new-taxid
        # value would wrongly drop a successfully-applied change that happens to share its
        # target taxid with a different, failed change. Old taxid is guaranteed unique per
        # change (one change per distinct ``db_org``).
        failed_old_tids = {f["old_taxid"] for f in apply_stats["failed"]}

        applied_changes = [
            c for c in changes if str(c.db_org.taxid).strip() not in failed_old_tids
        ]
        taxids_changed = sum(
            1 for c in applied_changes if c.change_type in ("taxid", "both")
        )
        updated_taxids = [
            str(c.fresh_org.taxid) for c in applied_changes if c.fresh_org.taxid
        ]
        if updated_taxids:
            prune_organisms_missing_taxon_lineage(updated_taxids)

    # TaxonNode intrinsic name/rank sync always runs, independent of organism-level
    # changes, so a pure higher-taxon rename/rank fix from ENA is not silently dropped.
    taxon_nodes_fields_updated = 0
    if fresh_taxons:
        _insert_new_taxon_nodes_from_dict(fresh_taxons)
        taxon_nodes_fields_updated = apply_taxon_node_intrinsic_updates_from_ena(
            fresh_taxons
        )

    touched_taxon_nodes: Set[str] = set()
    lineage_labels_refreshed = 0
    if updated_taxids:
        touched_taxon_nodes = rebuild_taxon_node_edges_for_organisms(
            fresh_taxons, updated_taxids, old_lineage_taxids=old_lineage_taxids
        )
        update_organism_counts(updated_taxids)
        update_taxon_node_counts(updated_taxids)
        if old_lineage_taxids:
            refresh_taxon_node_counts_for_lineage_keys(sorted(old_lineage_taxids))

        lineage_result = sync_backfill_organism_lineage_rank_labels_for_taxids(
            updated_taxids
        )
        lineage_labels_refreshed = int(lineage_result.get("organisms_scanned", 0) or 0)

    logger.info(
        "Taxonomy refresh: %d organism(s) updated, %d taxid change(s), %d change(s) "
        "failed, %d taxon node(s) intrinsic field update(s), %d taxon node(s) recounted, "
        "%d taxid collision(s) skipped, %d name collision(s) disambiguated, %d/%d "
        "single-taxon fallback(s) resolved",
        organisms_updated,
        taxids_changed,
        changes_failed,
        taxon_nodes_fields_updated,
        len(touched_taxon_nodes),
        collision_stats["taxid_collisions_skipped"],
        collision_stats["name_collisions_disambiguated"],
        fallback_stats["resolved"],
        fallback_stats["attempted"],
    )
    return {
        "organisms_updated": organisms_updated,
        "taxids_changed": taxids_changed,
        "species_fetched": len(species_taxids),
        "taxon_nodes_fields_updated": taxon_nodes_fields_updated,
        "taxid_collisions_skipped": collision_stats["taxid_collisions_skipped"],
        "name_collisions_disambiguated": collision_stats["name_collisions_disambiguated"],
        "changes_failed": changes_failed,
        "fallback_taxids_attempted": fallback_stats["attempted"],
        "fallback_taxids_resolved": fallback_stats["resolved"],
        "taxon_nodes_recounted": len(touched_taxon_nodes),
        "lineage_rank_labels_refreshed": lineage_labels_refreshed,
    }
