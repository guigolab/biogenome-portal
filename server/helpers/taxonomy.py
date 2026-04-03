from db.model import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)
from typing import Any, Dict, Iterable, List, Optional, Sequence, Set, Union
from pymongo import UpdateOne

_ENSURE_TAXON_INSERT_CHUNK = 1000


def ensure_taxon_nodes_for_organisms_lineages(organisms: Sequence[Any]) -> int:
    """
    Insert minimal ``TaxonNode`` rows for every taxid appearing in ``taxon_lineage`` that
    is not yet in the database.

    Without this, :func:`bulk_copy_organism_lineages_to_catalog` drops missing taxids from
    the ordered lineage chain, so ``parent`` / ``children`` edges are never written (e.g.
    genus never lists species as a child).

    Uses the organism's ``scientific_name`` for the organism taxid (first lineage element
    when it matches ``taxid``); other taxids use the taxid string as a temporary name until
    a taxonomy refresh fills real names/ranks.
    """
    if not organisms:
        return 0

    want_name: Dict[str, str] = {}
    all_ids: Set[str] = set()
    for o in organisms:
        otid = str(o.taxid).strip() if getattr(o, "taxid", None) else ""
        for raw in getattr(o, "taxon_lineage", None) or []:
            if raw is None:
                continue
            tid = str(raw).strip()
            if not tid:
                continue
            all_ids.add(tid)
            if otid and tid == otid:
                nm = (getattr(o, "scientific_name", None) or tid).strip() or tid
                want_name[tid] = nm
            elif tid not in want_name:
                want_name[tid] = tid

    if not all_ids:
        return 0

    id_list = sorted(all_ids)
    existing: Set[str] = set()
    for i in range(0, len(id_list), 2000):
        chunk = id_list[i : i + 2000]
        expanded = _taxid_match_values(chunk)
        for x in TaxonNode.objects(taxid__in=expanded).scalar("taxid"):
            if x is not None:
                existing.add(str(x).strip())

    missing = [t for t in id_list if t not in existing]
    if not missing:
        return 0

    inserted = 0
    for j in range(0, len(missing), _ENSURE_TAXON_INSERT_CHUNK):
        part = missing[j : j + _ENSURE_TAXON_INSERT_CHUNK]
        docs = [
            TaxonNode(
                taxid=t,
                name=want_name.get(t, t),
                rank="other",
            )
            for t in part
        ]
        TaxonNode.objects.insert(docs)
        inserted += len(docs)
    return inserted


def taxon_node_map_for_taxids(tax_ids: Iterable[str]) -> Dict[str, TaxonNode]:
    """
    Load ``TaxonNode`` documents keyed by ``str(taxid)``, expanding numeric taxids for BSON
    ``$in`` (string vs int storage).
    """
    ids = sorted({str(t).strip() for t in tax_ids if t is not None and str(t).strip()})
    out: Dict[str, Any] = {}
    for i in range(0, len(ids), 2000):
        chunk = ids[i : i + 2000]
        expanded = _taxid_match_values(chunk)
        for n in TaxonNode.objects(taxid__in=expanded):
            if n.taxid is not None:
                out[str(n.taxid).strip()] = n
    return out


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


