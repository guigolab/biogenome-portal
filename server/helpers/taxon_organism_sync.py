"""
Refresh Organism denormalized status (via ``Organism.save`` → pre_save/post_save) and TaxonNode
aggregate counts after related data mutations.

TaxonNode denormalized counts are updated here (and in ``_after_related_entity_deleted`` in
``db.signals``), not from an Organism post_save hook.

``trigger_organism_update`` is defined here; ``db.signals`` imports it at module load after
``db.documents`` so there is no circular import.

MongoEngine note: organism refresh loads a subset of fields with ``.only(...)`` before ``save()``.
Pre_save writes counts/status onto the in-memory document; only dirty fields should be persisted.
If your MongoEngine version ever nulls omitted fields on save, switch to a full ``reload()``+``save()``.
"""

from __future__ import annotations

from typing import Iterable, List, Optional, Set

from db.documents import Organism
from helpers.taxonomy import update_taxon_node_counts_for_taxids

# Fields read by ``update_organism_status`` / ``refresh_organism_status_fields`` on the in-memory doc.
_ORGANISM_REFRESH_ONLY_FIELDS = (
    "id",
    "taxid",
    "goat_status",
    "publications",
    "taxon_lineage",
)


def _taxids_for_count_refresh(
    taxid: Optional[str],
    taxon_lineage: Optional[List[str]],
) -> List[str]:
    """Taxids to pass to update_taxon_node_counts_for_taxids."""
    if taxon_lineage:
        return [str(x) for x in taxon_lineage if x is not None]
    if taxid:
        return [str(taxid)]
    return []


def refresh_organism_document_via_save(
    taxid: str,
    organism=None,
) -> Optional[List[str]]:
    """
    Load Organism (minimal fields), call ``save()`` so pre_save/post_save run.

    Returns a list of taxids for ``update_taxon_node_counts_for_taxids`` (lineage or ``[taxid]``),
    or ``None`` if no Organism document exists (caller typically falls back to ``[taxid]`` for
    tree counts only).
    """
    tid = str(taxid)
    org = organism
    if org is None:
        org = (
            Organism.objects(taxid=tid)
            .only(*_ORGANISM_REFRESH_ONLY_FIELDS)
            .no_dereference()
            .first()
        )
    if not org:
        return None
    org.save(validate=True)
    lin = getattr(org, "taxon_lineage", None) or []
    if lin:
        return [str(x) for x in lin if x is not None]
    return [tid]


def trigger_organism_update(taxid: str) -> None:
    """Public entry used from ``db.signals`` and jobs; refreshes organism via save (signals)."""
    refresh_organism_document_via_save(str(taxid))


def sync_organism_status_and_taxon_counts(
    taxid: Optional[str],
    taxon_lineage: Optional[List[str]] = None,
) -> None:
    """
    - Recompute Organism insdc/goat status via Organism.save → pre_save.
    - Refresh TaxonNode denormalized counts for the species lineage (or [taxid] as fallback).
    """
    if not taxid:
        return

    tid = str(taxid)

    if taxon_lineage is not None:
        refresh_organism_document_via_save(tid)
        ids = _taxids_for_count_refresh(tid, list(taxon_lineage))
    else:
        ids_from_save = refresh_organism_document_via_save(tid)
        if ids_from_save is not None:
            ids = ids_from_save
        else:
            ids = [tid]

    if ids:
        update_taxon_node_counts_for_taxids(ids)


def sync_many_taxids(taxids: Iterable[Optional[str]]) -> None:
    """
    After bulk insert of related documents: refresh organism status per unique species taxid
    and run a single TaxonNode count refresh over the union of all those species' lineages
    (one Organism query, then save per loaded doc — no per-tid find).
    """
    unique = sorted({str(t) for t in taxids if t is not None})
    if not unique:
        return

    orgs = list(
        Organism.objects(taxid__in=unique)
        .only(*_ORGANISM_REFRESH_ONLY_FIELDS)
        .no_dereference()
    )
    by_taxid = {str(o.taxid): o for o in orgs}

    all_nodes: Set[str] = set(unique)
    for org in orgs:
        if org.taxon_lineage:
            all_nodes.update(str(x) for x in org.taxon_lineage if x is not None)

    for tid in unique:
        org = by_taxid.get(tid)
        if org:
            refresh_organism_document_via_save(tid, organism=org)

    if all_nodes:
        update_taxon_node_counts_for_taxids(sorted(all_nodes))
