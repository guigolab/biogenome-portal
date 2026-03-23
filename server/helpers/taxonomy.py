from db.model import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)
from typing import Any, Dict, Iterable, List, Optional, Set, Union
from pymongo import UpdateOne


def _taxid_match_values(chunk: List[str]) -> List[Union[str, int]]:
    """
    Catalog docs may store ``taxid`` as BSON string or int; numeric IDs need both in ``$in``.
    """
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


def _organism_counts_by_lineage_taxids(tax_ids: List[str], chunk_size: int) -> Dict[str, int]:
    """
    For each taxid T, count Organism docs whose taxon_lineage contains T.
    One aggregation per chunk (same logic as former inline pipeline in bulk_refresh).
    """
    org_coll = Organism._get_collection()
    counts: Dict[str, int] = {}

    for i in range(0, len(tax_ids), chunk_size):
        chunk = tax_ids[i : i + chunk_size]
        expanded = _taxid_match_values(chunk)
        pipeline = [
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
        for row in org_coll.aggregate(pipeline):
            k = str(row["_id"])
            counts[k] = counts.get(k, 0) + int(row["cnt"])
    return counts


def _counts_grouped_by_taxid_field(
    collection: Any,
    tax_ids: List[str],
    chunk_size: int,
    field: str = "taxid",
) -> Dict[str, int]:
    """$match field in chunk, $group by field -> document counts per value."""
    out: Dict[str, int] = {}
    for i in range(0, len(tax_ids), chunk_size):
        chunk = tax_ids[i : i + chunk_size]
        expanded = _taxid_match_values(chunk)
        pipeline = [
            {"$match": {field: {"$in": expanded}}},
            {"$group": {"_id": f"${field}", "cnt": {"$sum": 1}}},
        ]
        for row in collection.aggregate(pipeline):
            if row["_id"] is not None:
                k = str(row["_id"])
                out[k] = out.get(k, 0) + int(row["cnt"])
    return out


def _resource_counts_by_lineage_taxids(
    collection: Any,
    tax_ids: List[str],
    chunk_size: int,
) -> Dict[str, int]:
    """
    For each taxid T, count catalog documents that roll up to T on the taxon tree:

    - Documents with ``taxon_lineage`` containing T (same unwind pattern as
      ``_organism_counts_by_lineage_taxids``), so ancestor nodes get non-zero
      assemblies / reads / biosamples / etc.
    - Documents with missing or empty ``taxon_lineage`` but ``taxid`` in the
      chunk (legacy or pre-reload rows), counted once on their species taxid.
    """
    counts: Dict[str, int] = {}
    for i in range(0, len(tax_ids), chunk_size):
        chunk = tax_ids[i : i + chunk_size]
        expanded = _taxid_match_values(chunk)
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


def _bulk_set_taxon_counts(tax_ids: List[str], chunk_size: int = 3000) -> None:
    """Recompute denormalized counts for the given TaxonNode taxids (bulk aggregations + bulk_write)."""
    if not tax_ids:
        return

    org_by_tid = _organism_counts_by_lineage_taxids(tax_ids, chunk_size)
    asm_by_tid = _resource_counts_by_lineage_taxids(
        Assembly._get_collection(), tax_ids, chunk_size
    )
    reads_by_tid = _resource_counts_by_lineage_taxids(
        ReadRun._get_collection(), tax_ids, chunk_size
    )
    bio_by_tid = _resource_counts_by_lineage_taxids(
        BioSample._get_collection(), tax_ids, chunk_size
    )
    local_by_tid = _resource_counts_by_lineage_taxids(
        LocalSample._get_collection(), tax_ids, chunk_size
    )
    ga_by_tid = _resource_counts_by_lineage_taxids(
        GenomeAnnotation._get_collection(), tax_ids, chunk_size
    )

    node_coll = TaxonNode._get_collection()
    ops: List[UpdateOne] = [
        UpdateOne(
            {"taxid": tid},
            {
                "$set": {
                    "organisms_count": org_by_tid.get(tid, 0),
                    "assemblies_count": asm_by_tid.get(tid, 0),
                    "reads_count": reads_by_tid.get(tid, 0),
                    "biosamples_count": bio_by_tid.get(tid, 0),
                    "local_samples_count": local_by_tid.get(tid, 0),
                    "genome_annotations_count": ga_by_tid.get(tid, 0),
                }
            },
        )
        for tid in tax_ids
    ]
    if ops:
        node_coll.bulk_write(ops, ordered=False)


def update_taxon_node_counts_for_taxids(
    tax_ids: Iterable[str],
    chunk_size: int = 3000,
) -> None:
    """
    Refresh denormalized counts on TaxonNode documents for the given taxids.

    Same bulk strategy as update_taxon_nodes_counts but takes taxids directly (no TaxonNode fetch).
    """
    ids = sorted({str(t) for t in tax_ids if t is not None})
    _bulk_set_taxon_counts(ids, chunk_size)


def refresh_taxon_counts_for_lineage(
    primary_taxid: Optional[str],
    taxon_lineage: Optional[Iterable[str]],
) -> None:
    """
    Recompute TaxonNode aggregate fields for the species taxid and every ancestor taxid
    in ``taxon_lineage``. Call after CRUD on resources tied to an organism lineage so tree
    stats stay aligned with ``TaxonNode`` count fields.
    """
    keys: List[str] = []
    if primary_taxid is not None and str(primary_taxid).strip():
        keys.append(str(primary_taxid))
    if taxon_lineage is not None:
        keys.extend(str(t) for t in taxon_lineage if t is not None)
    update_taxon_node_counts_for_taxids(keys)


