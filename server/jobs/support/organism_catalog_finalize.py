"""
Catalog denormalization: lineage copy, counters, TaxonNode roll-ups, INSDC/GoaT status,
GoaT bulk updates, upload permission checks, finalize orchestration, ingest tail.

Depends on :mod:`organism_catalog_guard` for orphan guards / batch taxid helpers and on
:mod:`organism_catalog_taxonomy` for ENA organism bootstrap used by upload flows.
"""

from __future__ import annotations

import datetime
import logging
from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Tuple, Type, Union

from pymongo import UpdateMany, UpdateOne

from db.constants import GOAT_PROJECT_NAME
from db.enums import Roles, TargetListStatus
from db.model import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    GoaTUpdateDate,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)
from helpers.organism_denorm_pure import (
    MergeContext,
    RelatedCounts,
    derive_organism_denorm,
)
from jobs.support.organism_catalog_guard import (
    TDoc,
    delete_rows_without_organism,
    existing_organism_taxids,
    surviving_taxids_after_cleanup,
    taxids_on_catalog_documents,
    union_sorted_species_taxids,
)
from jobs.support.organism_catalog_taxonomy import handle_full_taxonomy_from_taxids
from jobs.support.readrun_ena_tsv import backfill_readrun_taxon_lineage_from_organisms

logger = logging.getLogger(__name__)

DEFAULT_CHUNK = 3000
_LINEAGE_BULK_CHUNK = 1000
DEFAULT_GOAT_BULK_CHUNK = 500


def check_user_permission_for_taxid(user: Any, taxid: str) -> Optional[str]:
    if taxid not in user.species:
        return (
            f"The organism {taxid} already exists in the db and you don't have the "
            "rights to modify it!"
        )
    return None


def check_species_permission(user: Any, existing_taxids: Iterable[str]) -> List[str]:
    if user.role.value == Roles.DATA_ADMIN.value:
        return []
    return [
        check_user_permission_for_taxid(user, taxid)
        for taxid in existing_taxids
        if taxid not in user.species
    ]


def species_upload_permission_errors(user: Any, taxids: Iterable[str]) -> List[str]:
    """
    For taxids referenced by an upload: if an Organism already exists, enforce user scope.
    """
    taxids_list = sorted({str(t) for t in taxids if t is not None and str(t).strip() != ""})
    if not taxids_list:
        return []
    existing = list(Organism.objects(taxid__in=taxids_list).scalar("taxid"))
    if not existing:
        return []
    return [e for e in check_species_permission(user, existing) if e]


@dataclass
class NewOrganismsImportResult:
    """Outcome of ENA bulk import for taxids that lacked an Organism row."""

    saved_organism_taxids: List[str]
    allowed_taxids: frozenset[str]
    missing_taxids: Tuple[str, ...]


def import_missing_organisms_for_taxids(
    new_taxids: Sequence[str],
    tmp_dir: str,
    *,
    reload_organism_dependencies: bool = True,
) -> NewOrganismsImportResult:
    """
    Create missing Organism/TaxonNode rows via ENA and optionally reload catalog lineages.
    """
    uniq = tuple(dict.fromkeys(str(t) for t in new_taxids if t is not None and str(t).strip()))
    if not uniq:
        return NewOrganismsImportResult([], frozenset(), ())

    saved = handle_full_taxonomy_from_taxids(list(uniq), tmp_dir)
    if reload_organism_dependencies:
        bulk_copy_organism_lineages_to_catalog(saved)

    allowed_list = Organism.objects(taxid__in=list(uniq)).scalar("taxid")
    allowed = frozenset(str(t) for t in allowed_list if t is not None)
    missing = tuple(t for t in uniq if str(t) not in allowed)
    return NewOrganismsImportResult(list(saved), allowed, missing)


def _publications_to_bson(org: Organism) -> list:
    out = []
    for p in org.publications or []:
        raw = p.to_mongo()
        if hasattr(raw, "to_dict"):
            raw = raw.to_dict()
        else:
            raw = dict(raw)
        out.append(raw)
    return out


def _apply_goat_payload_to_organism(
    org: Organism,
    data_to_update: Dict[str, Any],
    sub_project: Optional[str],
) -> None:
    publication = data_to_update.get("publications")
    tls = data_to_update.get("target_list_status")
    if tls is None or (isinstance(tls, str) and not tls.strip()):
        org.target_list_status = TargetListStatus.LONG_LIST
    else:
        org.target_list_status = tls.strip() if isinstance(tls, str) else tls
    org.goat_status = data_to_update.get("goat_status")
    org.sub_project = sub_project
    if publication and not any(
        getattr(pub, "id", None) == publication.id for pub in (org.publications or [])
    ):
        if org.publications is None:
            org.publications = []
        org.publications.append(publication)


def _goat_organism_bson_set(org: Organism) -> Dict[str, Any]:
    return {
        "target_list_status": _scalar_enum_value(org.target_list_status),
        "goat_status": _scalar_enum_value(org.goat_status),
        "sub_project": org.sub_project,
        "publications": _publications_to_bson(org),
    }


def bulk_apply_goat_report_updates(
    rows_map: Dict[str, Dict[str, Any]],
    sub_project: Optional[str],
    *,
    chunk_size: int = DEFAULT_GOAT_BULK_CHUNK,
) -> Tuple[List[str], List[str]]:
    """
    Apply GoaT row payloads with pymongo bulk_write.

    Returns ``(scientific_names_updated, taxids_updated)``.
    """
    if not GOAT_PROJECT_NAME:
        return [], []
    taxids_to_update = list(rows_map.keys())
    if not taxids_to_update:
        return [], []

    organisms = Organism.objects(taxid__in=taxids_to_update).only(
        "taxid",
        "scientific_name",
        "target_list_status",
        "goat_status",
        "sub_project",
        "publications",
    )
    by_taxid = {str(o.taxid): o for o in organisms}

    coll = Organism._get_collection()
    names_out: List[str] = []
    taxids_out: List[str] = []
    ops: List[UpdateOne] = []

    for taxid, payload in rows_map.items():
        tid = str(taxid)
        org = by_taxid.get(tid)
        if not org:
            continue
        _apply_goat_payload_to_organism(org, payload, sub_project)
        ops.append(UpdateOne({"taxid": tid}, {"$set": _goat_organism_bson_set(org)}))
        names_out.append(org.scientific_name or tid)
        taxids_out.append(tid)
        if len(ops) >= chunk_size:
            coll.bulk_write(ops, ordered=False)
            ops.clear()

    if ops:
        coll.bulk_write(ops, ordered=False)

    return names_out, taxids_out


def _taxid_variants_for_in_clause(chunk: List[str]) -> List[Union[str, int]]:
    """Values for ``$in`` matching catalog docs with string or int ``taxid``."""
    out: List[Union[str, int]] = []
    seen_str: Set[str] = set()
    seen_int: Set[int] = set()
    for v in chunk:
        s = str(v).strip() if v is not None else ""
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


def _catalog_taxid_filter(tid: str) -> Dict[str, Any]:
    tid = str(tid).strip()
    if not tid:
        return {"taxid": tid}
    variants: List[Union[str, int]] = [tid]
    if tid.isdigit():
        try:
            variants.append(int(tid))
        except ValueError:
            pass
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


def _scalar_enum_value(v: Any) -> Any:
    if v is None:
        return None
    return v.value if hasattr(v, "value") else v


def _bulk_update_taxonnode_edges_from_organism_lineages(
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

    for organism in organisms:
        tid = str(organism.taxid)
        lineage_list = list(organism.taxon_lineage) if organism.taxon_lineage else []
        flt = _catalog_taxid_filter(tid)
        bio_ops.append(UpdateMany(flt, {"$set": {"taxon_lineage": lineage_list}}))
        asm_ops.append(UpdateMany(flt, {"$set": {"taxon_lineage": lineage_list}}))
        read_ops.append(UpdateMany(flt, {"$set": {"taxon_lineage": lineage_list}}))

    _chunked_bulk_write(BioSample._get_collection(), bio_ops)
    _chunked_bulk_write(Assembly._get_collection(), asm_ops)
    _chunked_bulk_write(ReadRun._get_collection(), read_ops)


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
        Organism.objects(taxid__in=unique_taxids).only("taxid", "taxon_lineage")
    )
    if not orgs:
        return

    all_lineage_taxids: Set[str] = set()
    for o in orgs:
        if o.taxon_lineage:
            all_lineage_taxids.update(str(x) for x in o.taxon_lineage if x is not None)

    taxon_map: Dict[str, Any] = {}
    if all_lineage_taxids:
        taxon_map = {
            str(n.taxid): n
            for n in TaxonNode.objects(taxid__in=list(all_lineage_taxids))
        }

    _bulk_update_taxonnode_edges_from_organism_lineages(orgs, taxon_map)
    _bulk_set_catalog_taxon_lineage_for_species(orgs)


def _count_by_taxid_field(
    collection: Any,
    tax_ids: List[str],
    chunk_size: int,
    field: str = "taxid",
) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for i in range(0, len(tax_ids), chunk_size):
        chunk = tax_ids[i : i + chunk_size]
        expanded = _taxid_variants_for_in_clause(chunk)
        if not expanded:
            continue
        pipeline = [
            {"$match": {field: {"$in": expanded}}},
            {"$group": {"_id": f"${field}", "cnt": {"$sum": 1}}},
        ]
        for row in collection.aggregate(pipeline):
            if row["_id"] is not None:
                k = str(row["_id"])
                out[k] = out.get(k, 0) + int(row["cnt"])
    return out


def bulk_update_organism_counts_for_taxids(
    species_taxids: Iterable[Union[str, int]],
    *,
    chunk_size: int = DEFAULT_CHUNK,
) -> None:
    """Recompute the five counter fields on Organism from related collections."""
    ids = sorted({str(t) for t in species_taxids if t is not None})
    if not ids:
        return

    asm_by = _count_by_taxid_field(Assembly._get_collection(), ids, chunk_size)
    reads_by = _count_by_taxid_field(ReadRun._get_collection(), ids, chunk_size)
    bio_by = _count_by_taxid_field(BioSample._get_collection(), ids, chunk_size)
    local_by = _count_by_taxid_field(LocalSample._get_collection(), ids, chunk_size)
    ga_by = _count_by_taxid_field(GenomeAnnotation._get_collection(), ids, chunk_size)

    org_coll = Organism._get_collection()
    ops: List[UpdateOne] = []
    for i in range(0, len(ids), chunk_size):
        batch = ids[i : i + chunk_size]
        present = {
            str(x)
            for x in Organism.objects(taxid__in=batch).scalar("taxid")
            if x is not None
        }
        for tid in batch:
            if tid not in present:
                continue
            ops.append(
                UpdateOne(
                    {"taxid": tid},
                    {
                        "$set": {
                            "assemblies_count": asm_by.get(tid, 0),
                            "reads_count": reads_by.get(tid, 0),
                            "biosamples_count": bio_by.get(tid, 0),
                            "local_samples_count": local_by.get(tid, 0),
                            "genome_annotations_count": ga_by.get(tid, 0),
                        }
                    },
                )
            )
    _chunked_bulk_write(org_coll, ops, batch_size=chunk_size)


def _rollup_lineage_key_counts(
    collection: Any,
    tax_keys: List[str],
    chunk_size: int,
    *,
    include_docs_without_lineage: bool,
) -> Dict[str, int]:
    """
    Count documents per taxon key across ``taxon_lineage``.

    When ``include_docs_without_lineage`` is True, documents with a matching ``taxid`` and
    missing/empty ``taxon_lineage`` also contribute to that taxid key.
    """
    counts: Dict[str, int] = {}
    for i in range(0, len(tax_keys), chunk_size):
        chunk = tax_keys[i : i + chunk_size]
        expanded = _taxid_variants_for_in_clause(chunk)
        if not expanded:
            continue
        lineage_pipeline = [
            {"$match": {"taxon_lineage": {"$in": expanded}}},
            {"$unwind": "$taxon_lineage"},
            {"$match": {"taxon_lineage": {"$in": expanded}}},
            {
                "$group": {
                    "_id": {"$toString": "$taxon_lineage"},
                    "cnt": {"$sum": 1},
                }
            },
        ]
        for row in collection.aggregate(lineage_pipeline):
            if row["_id"] is not None:
                tid = str(row["_id"])
                counts[tid] = counts.get(tid, 0) + int(row["cnt"])

        if not include_docs_without_lineage:
            continue

        no_lineage_pipeline = [
            {
                "$match": {
                    "taxid": {"$in": expanded},
                    "$or": [
                        {"taxon_lineage": {"$exists": False}},
                        {"taxon_lineage": None},
                        {"taxon_lineage": []},
                    ],
                }
            },
            {"$group": {"_id": {"$toString": "$taxid"}, "cnt": {"$sum": 1}}},
        ]
        for row in collection.aggregate(no_lineage_pipeline):
            if row["_id"] is not None:
                tid = str(row["_id"])
                counts[tid] = counts.get(tid, 0) + int(row["cnt"])
    return counts


def _recompute_taxon_node_count_documents(
    taxon_node_taxids: List[str],
    chunk_size: int,
) -> None:
    if not taxon_node_taxids:
        return

    org_by = _rollup_lineage_key_counts(
        Organism._get_collection(),
        taxon_node_taxids,
        chunk_size,
        include_docs_without_lineage=False,
    )
    asm_by = _rollup_lineage_key_counts(
        Assembly._get_collection(),
        taxon_node_taxids,
        chunk_size,
        include_docs_without_lineage=True,
    )
    reads_by = _rollup_lineage_key_counts(
        ReadRun._get_collection(),
        taxon_node_taxids,
        chunk_size,
        include_docs_without_lineage=True,
    )
    bio_by = _rollup_lineage_key_counts(
        BioSample._get_collection(),
        taxon_node_taxids,
        chunk_size,
        include_docs_without_lineage=True,
    )
    local_by = _rollup_lineage_key_counts(
        LocalSample._get_collection(),
        taxon_node_taxids,
        chunk_size,
        include_docs_without_lineage=True,
    )
    ga_by = _rollup_lineage_key_counts(
        GenomeAnnotation._get_collection(),
        taxon_node_taxids,
        chunk_size,
        include_docs_without_lineage=True,
    )

    node_coll = TaxonNode._get_collection()
    ops = [
        UpdateOne(
            {"taxid": tid},
            {
                "$set": {
                    "organisms_count": org_by.get(tid, 0),
                    "assemblies_count": asm_by.get(tid, 0),
                    "reads_count": reads_by.get(tid, 0),
                    "biosamples_count": bio_by.get(tid, 0),
                    "local_samples_count": local_by.get(tid, 0),
                    "genome_annotations_count": ga_by.get(tid, 0),
                }
            },
        )
        for tid in taxon_node_taxids
    ]
    _chunked_bulk_write(node_coll, ops, batch_size=chunk_size)


def _collect_lineage_keys_for_species_taxids(
    species_taxids: List[str],
    chunk_size: int,
) -> List[str]:
    keys: Set[str] = set()
    for i in range(0, len(species_taxids), chunk_size):
        batch = species_taxids[i : i + chunk_size]
        for org in Organism.objects(taxid__in=batch).only("taxid", "taxon_lineage"):
            keys.add(str(org.taxid))
            if org.taxon_lineage:
                keys.update(str(x) for x in org.taxon_lineage if x is not None)
    return sorted(keys)


def bulk_update_taxon_node_counts_for_taxids(
    species_taxids: Iterable[Union[str, int]],
    *,
    chunk_size: int = DEFAULT_CHUNK,
) -> None:
    """
    For each species taxid, expand to species + ancestor keys from ``Organism.taxon_lineage``,
    then refresh ``TaxonNode`` counter fields for those nodes.
    """
    ids = sorted({str(t) for t in species_taxids if t is not None})
    if not ids:
        return
    keys = _collect_lineage_keys_for_species_taxids(ids, chunk_size)
    _recompute_taxon_node_count_documents(keys, chunk_size)


def bulk_update_taxon_node_counts_for_keys(
    taxon_node_taxids: Iterable[Union[str, int]],
    *,
    chunk_size: int = DEFAULT_CHUNK,
) -> None:
    """Refresh ``TaxonNode`` counters for an explicit list of node taxids (e.g. prune recount)."""
    keys = sorted({str(t) for t in taxon_node_taxids if t is not None and str(t).strip()})
    _recompute_taxon_node_count_documents(keys, chunk_size)


def bulk_update_organism_statuses_for_taxids(
    species_taxids: Iterable[Union[str, int]],
    *,
    merge_context: MergeContext = "default",
    apply_goat_inference: bool = True,
    chunk_size: int = DEFAULT_CHUNK,
) -> None:
    """Set ``insdc_status``, optional ``goat_status``, and ``GoaTUpdateDate`` from denorm rules."""
    ids = sorted({str(t) for t in species_taxids if t is not None})
    if not ids:
        return

    org_coll = Organism._get_collection()
    touch_taxids: List[str] = []
    now = datetime.datetime.now()

    for i in range(0, len(ids), chunk_size):
        batch_ids = ids[i : i + chunk_size]
        orgs = list(
            Organism.objects(taxid__in=batch_ids).only(
                "taxid",
                "goat_status",
                "publications",
                "assemblies_count",
                "reads_count",
                "biosamples_count",
                "local_samples_count",
                "genome_annotations_count",
            )
        )
        org_by_tid = {str(o.taxid): o for o in orgs}

        ops: List[UpdateOne] = []
        for tid in batch_ids:
            org = org_by_tid.get(tid)
            if not org:
                continue
            counts = RelatedCounts(
                assemblies=int(org.assemblies_count or 0),
                reads=int(org.reads_count or 0),
                biosamples=int(org.biosamples_count or 0),
                local_samples=int(org.local_samples_count or 0),
                genome_annotations=int(org.genome_annotations_count or 0),
            )
            derived = derive_organism_denorm(
                counts,
                current_goat_status=getattr(org, "goat_status", None),
                has_publications=bool(org.publications),
                goat_project_name=GOAT_PROJECT_NAME,
                apply_goat_inference=apply_goat_inference,
                merge_context=merge_context,
            )
            set_doc: Dict[str, Any] = {
                "insdc_status": _scalar_enum_value(derived.insdc_status),
            }
            if derived.update_goat_field:
                set_doc["goat_status"] = _scalar_enum_value(derived.goat_status)
            ops.append(UpdateOne({"taxid": tid}, {"$set": set_doc}))
            if derived.touch_goat_update_date:
                touch_taxids.append(tid)

        if ops:
            org_coll.bulk_write(ops, ordered=False)

    if touch_taxids:
        seen = sorted(set(touch_taxids))
        date_coll = GoaTUpdateDate._get_collection()
        for j in range(0, len(seen), chunk_size):
            chunk = seen[j : j + chunk_size]
            date_coll.bulk_write(
                [
                    UpdateOne(
                        {"taxid": t},
                        {"$set": {"taxid": t, "updated": now}},
                        upsert=True,
                    )
                    for t in chunk
                ],
                ordered=False,
            )


def finalize_organism_catalog_for_taxids(
    species_taxids: Iterable[Union[str, int]],
    *,
    merge_context: MergeContext = "default",
    apply_goat_inference: bool = True,
    chunk_size: int = DEFAULT_CHUNK,
    copy_lineages: bool = True,
) -> None:
    """
    Run lineage copy (optional), organism counts, TaxonNode counts, organism statuses.
    """
    ids = sorted({str(t) for t in species_taxids if t is not None})
    if not ids:
        return
    if copy_lineages:
        bulk_copy_organism_lineages_to_catalog(ids)
    bulk_update_organism_counts_for_taxids(ids, chunk_size=chunk_size)
    bulk_update_taxon_node_counts_for_taxids(ids, chunk_size=chunk_size)
    bulk_update_organism_statuses_for_taxids(
        ids,
        merge_context=merge_context,
        apply_goat_inference=apply_goat_inference,
        chunk_size=chunk_size,
    )


def reload_prune_denorm_after_taxonomy_import(
    catalog_model: Type[TDoc],
    id_field: str,
    import_ids: Optional[Iterable[str]],
    saved_organism_taxids: Iterable[Any],
    *,
    merge_context: Optional[MergeContext] = None,
) -> int:
    """
    Read/biosample import tail: lineage copy for touched taxids, optional ReadRun backfill,
    prune ``import_ids`` rows with no Organism, finalize denorm, extra TaxonNode recount.

    Returns the number of catalog documents deleted.
    """
    ids: List[str] = []
    if import_ids:
        ids = list(dict.fromkeys(str(x) for x in import_ids if x))

    batch_taxids = taxids_on_catalog_documents(
        catalog_model, id_field, ids, id_batch_size=5000
    )
    # Union species from this import batch and newly inserted organism rows.
    reload_taxids = union_sorted_species_taxids(
        batch_taxids,
        saved_organism_taxids,
    )
    bulk_copy_organism_lineages_to_catalog(reload_taxids)

    if catalog_model is ReadRun and ids:
        backfill_readrun_taxon_lineage_from_organisms(ids)

    if not ids:
        return 0

    removed = delete_rows_without_organism(catalog_model, id_field, ids)
    surviving = surviving_taxids_after_cleanup(catalog_model, id_field, ids)
    # Union newly inserted organism taxids and taxids still present after prune.
    sync_taxids = union_sorted_species_taxids(
        saved_organism_taxids,
        surviving,
    )
    if sync_taxids:
        if merge_context is not None:
            finalize_organism_catalog_for_taxids(
                sync_taxids,
                copy_lineages=False,
                merge_context=merge_context,
            )
        else:
            finalize_organism_catalog_for_taxids(sync_taxids, copy_lineages=False)

    if batch_taxids:
        touched = existing_organism_taxids(batch_taxids)
        if touched:
            recount_keys: Set[str] = set(touched)
            for org in Organism.objects(taxid__in=list(touched)).only("taxon_lineage"):
                if org.taxon_lineage:
                    recount_keys.update(
                        str(x) for x in org.taxon_lineage if x is not None
                    )
            bulk_update_taxon_node_counts_for_keys(sorted(recount_keys))
    return removed
