from db.documents import (
    Assembly,
    BioSample,
    BioSampleSubmission,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)
from db.enums import Roles
from typing import Any, Dict, Iterable, List
from pymongo import UpdateOne


def _organism_counts_by_lineage_taxids(tax_ids: List[str], chunk_size: int) -> Dict[str, int]:
    """
    For each taxid T, count Organism docs whose taxon_lineage contains T.
    One aggregation per chunk (same logic as former inline pipeline in bulk_refresh).
    """
    org_coll = Organism._get_collection()
    counts: Dict[str, int] = {}

    for i in range(0, len(tax_ids), chunk_size):
        chunk = tax_ids[i : i + chunk_size]
        pipeline = [
            {"$match": {"taxon_lineage": {"$in": chunk}}},
            {"$unwind": "$taxon_lineage"},
            {"$match": {"taxon_lineage": {"$in": chunk}}},
            {
                "$group": {
                    "_id": {"$toString": "$taxon_lineage"},
                    "cnt": {"$sum": 1},
                }
            },
        ]
        for row in org_coll.aggregate(pipeline):
            counts[str(row["_id"])] = row["cnt"]
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
        pipeline = [
            {"$match": {field: {"$in": chunk}}},
            {"$group": {"_id": f"${field}", "cnt": {"$sum": 1}}},
        ]
        for row in collection.aggregate(pipeline):
            if row["_id"] is not None:
                out[str(row["_id"])] = row["cnt"]
    return out


def bulk_refresh_taxon_node_leaves(
    taxids: Iterable[str],
    chunk_size: int = 3000,
) -> None:
    """
    Recompute TaxonNode.leaves in bulk: for each taxid, set leaves to the number of
    Organism documents whose taxon_lineage contains that taxid.

    Uses one aggregation scan per chunk of taxids (bounded $in size) plus a single
    bulk_write to TaxonNode — avoids N per-taxon count queries.

    Call after inserting organisms/taxa so tree counts stay consistent with
    count_leaves() / update_taxon_hierarchy().
    """
    tax_ids: List[str] = sorted({str(t) for t in taxids if t is not None})
    if not tax_ids:
        return

    counts = _organism_counts_by_lineage_taxids(tax_ids, chunk_size)

    node_coll = TaxonNode._get_collection()
    ops: List[UpdateOne] = [
        UpdateOne(
            {"taxid": tid},
            {"$set": {"leaves": counts.get(tid, 0)}},
        )
        for tid in tax_ids
    ]
    if ops:
        node_coll.bulk_write(ops, ordered=False)

def save_taxons_and_update_hierachy(parsed_taxons, organism_obj):
    save_parsed_taxons(parsed_taxons)
    ordered_nodes = get_and_order_saved_taxon_nodes(organism_obj)
    update_taxon_hierarchy(ordered_nodes)
    

def save_parsed_taxons(parsed_taxons):
    existing_taxids = TaxonNode.objects(taxid__in=[t.taxid for t in parsed_taxons]).scalar('taxid')
    taxons_to_save = [taxon for taxon in parsed_taxons if taxon.taxid not in existing_taxids]
    if taxons_to_save:
        TaxonNode.objects.insert(taxons_to_save)

def check_species_permission(user, existing_taxids):
    if user.role.value == Roles.DATA_ADMIN.value:
        return []

    return [check_user_permission_for_taxid(user, taxid) for taxid in existing_taxids if taxid not in user.species]


def check_user_permission_for_taxid(user, taxid):
    if taxid not in user.species:
        return f"The organism {taxid} already exists in the db and you don't have the rights to modify it!"
    return None

def get_and_order_saved_taxon_nodes(organism_obj):
    taxon_lineage = organism_obj.taxon_lineage
    # Retrieve the taxon nodes from the database
    taxon_nodes = TaxonNode.objects(taxid__in=taxon_lineage)
    
    # Create a dictionary for quick lookup
    taxon_node_dict = {node.taxid: node for node in taxon_nodes}
    
    # Order the taxon nodes based on the taxon_lineage
    ordered_taxon_list = [taxon_node_dict[taxid] for taxid in taxon_lineage if taxid in taxon_node_dict]

    return ordered_taxon_list

def get_ordered_taxons(taxids):
    """
    Reload taxons from database and return them ordered by lineage from species to root
    """
    reloaded_taxons = TaxonNode.objects(taxid__in=taxids)
    taxon_map = {t.taxid: t for t in reloaded_taxons}
    # Filter out any taxids that weren't found in the database
    return [taxon_map[t] for t in taxids if t in taxon_map]


def update_taxon_hierarchy(ordered_nodes):
    for index in range(len(ordered_nodes) - 1):
        child_taxon = ordered_nodes[index]
        father_taxon = ordered_nodes[index + 1]
        leaves = count_leaves(father_taxon)
        father_taxon.modify(add_to_set__children=child_taxon.taxid, leaves=leaves)
        child_taxon.modify(parent=father_taxon.taxid)


def count_leaves(father_taxon):
    """Number of organisms that include this taxid anywhere in taxon_lineage."""
    return Organism.objects(taxon_lineage=father_taxon.taxid).count()


def _bulk_set_taxon_counts(tax_ids: List[str], chunk_size: int = 3000) -> None:
    """Recompute denormalized counts for the given TaxonNode taxids (bulk aggregations + bulk_write)."""
    if not tax_ids:
        return

    org_by_tid = _organism_counts_by_lineage_taxids(tax_ids, chunk_size)
    asm_by_tid = _counts_grouped_by_taxid_field(Assembly._get_collection(), tax_ids, chunk_size)
    reads_by_tid = _counts_grouped_by_taxid_field(ReadRun._get_collection(), tax_ids, chunk_size)
    bio_by_tid = _counts_grouped_by_taxid_field(BioSample._get_collection(), tax_ids, chunk_size)
    local_by_tid = _counts_grouped_by_taxid_field(LocalSample._get_collection(), tax_ids, chunk_size)
    sub_by_tid = _counts_grouped_by_taxid_field(
        BioSampleSubmission._get_collection(), tax_ids, chunk_size
    )
    ga_by_tid = _counts_grouped_by_taxid_field(GenomeAnnotation._get_collection(), tax_ids, chunk_size)

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
                    "submitted_biosamples_count": sub_by_tid.get(tid, 0),
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


def update_taxon_nodes_counts(
    taxon_nodes: Iterable[Any],
    chunk_size: int = 3000,
) -> None:
    """
    Refresh denormalized counts on TaxonNode documents.

    Replaces 8N count queries + N modify() with:
    - a few aggregation pipelines (chunked $in) over each collection
    - one unordered bulk_write for all nodes

    Only taxids are materialized from taxon_nodes; counts are merged in memory as
    small dicts (one int per taxid per metric), not full cursors.
    """
    tax_ids: List[str] = sorted(
        {str(n.taxid) for n in taxon_nodes if getattr(n, "taxid", None) is not None}
    )
    _bulk_set_taxon_counts(tax_ids, chunk_size)