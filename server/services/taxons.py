import csv
import io
import json
import os

from flask import Response
from werkzeug.exceptions import BadRequest, NotFound

from db.model import TaxonNode
from extensions.cache import cache
from helpers import organism as organism_helper
from helpers.resource_mixins import dump_json
from helpers.service_utils import get_or_404

ROOT_NODE = os.getenv("ROOT_NODE")

# Column order for table / TSV / JSONL (JSON uses same field names in each row object).
ROOT_TREE_COUNT_FIELDS = (
    "organisms_count",
    "assemblies_count",
    "reads_count",
    "biosamples_count",
    "local_samples_count",
    "genome_annotations_count",
)
ROOT_TREE_FIELDS = (
    "taxid",
    "parent_taxid",
    "name",
    "rank",
    *ROOT_TREE_COUNT_FIELDS,
)


def _normalize_rank(rank: str) -> str:
    return (rank or "").strip().lower()


def _collect_subtree_taxids(root_taxid: str, rank_level: str):
    """
    Collect subtree taxids and an in-memory children map for preview/stream use.
    Descending stops at nodes whose rank matches ``rank_level``.
    """
    root_taxid = str(root_taxid).strip()
    if not root_taxid:
        raise BadRequest(description="taxid is required")

    rank_level = _normalize_rank(rank_level)
    if not rank_level:
        raise BadRequest(description="rank_level is required")

    taxon_coll = TaxonNode._get_collection()
    root = taxon_coll.find_one({"taxid": root_taxid}, {"taxid": 1})
    if not root:
        raise NotFound(description=f"Taxon {root_taxid} not found")

    children_map = {}
    for doc in taxon_coll.find({}, {"taxid": 1, "children": 1, "rank": 1}):
        children_map[doc["taxid"]] = {
            "children": doc.get("children") or [],
            "rank": _normalize_rank(doc.get("rank")),
        }

    selected = set()
    stack = [root_taxid]
    while stack:
        current = stack.pop()
        if current in selected:
            continue
        selected.add(current)
        node = children_map.get(current)
        if not node:
            continue
        if node["rank"] == rank_level:
            continue
        stack.extend(node["children"])

    return selected, children_map


def get_root_taxon():
    """
    Portal root :class:`~db.model.TaxonNode` (``ROOT_NODE`` env). Used by the front for
    aggregate counts without duplicating root taxid in client config.
    """
    if not ROOT_NODE:
        raise NotFound(description="ROOT_NODE not configured")
    root_taxid = str(ROOT_NODE).strip()
    return get_or_404(TaxonNode, f"Root taxon {root_taxid} not found!", taxid=root_taxid)


def get_taxon_children(taxid):
    taxon = get_or_404(TaxonNode, f"Taxon {taxid} not found!", taxid=taxid)
    children = TaxonNode.objects(taxid__in=taxon.children).exclude("id")
    return children


def get_ancestors(taxid):
    taxon = get_or_404(TaxonNode, f"Taxon {taxid} not found!", taxid=taxid)
    ancestors = [taxon.to_mongo().to_dict()]
    parent = TaxonNode.objects(children=taxid).exclude("id").first()
    while parent:
        ancestors.append(parent.to_mongo().to_dict())
        parent = TaxonNode.objects(children=parent.taxid).exclude("id").first()
    ancestors.reverse()
    # Filter out the root node (taxid = 1)
    ancestors = [ancestor for ancestor in ancestors if ancestor["taxid"] != "1"]
    return dump_json(ancestors)


def _root_tree_match_skip() -> dict:
    """Match all TaxonNode docs under the portal root (exclude ancestors of ROOT_NODE)."""
    if not ROOT_NODE:
        raise NotFound(description="ROOT_NODE not configured")

    taxon_coll = TaxonNode._get_collection()
    skip_taxids = [
        doc["taxid"] for doc in taxon_coll.find({"children": ROOT_NODE}, {"taxid": 1})
    ]
    return {"taxid": {"$nin": skip_taxids}} if skip_taxids else {}


def _root_tree_aggregate_pipeline(match: dict) -> list:
    """Single scan: project parent + denormalized counts (no in-memory parent map)."""
    proj = {
        "_id": 0,
        "taxid": 1,
        "parent_taxid": "$parent",
        "name": {"$ifNull": ["$name", ""]},
        "rank": {"$ifNull": ["$rank", ""]},
    }
    for field in ROOT_TREE_COUNT_FIELDS:
        proj[field] = {"$ifNull": [f"${field}", 0]}
    return [{"$match": match}, {"$project": proj}]


def iter_root_tree_documents(batch_size: int = 1000):
    """
    Stream TaxonNode rows as dicts (memory-friendly for JSONL/TSV).
    Uses stored ``parent`` field; run taxonomy backfill if parent_taxid is often null.
    """
    match = _root_tree_match_skip()
    taxon_coll = TaxonNode._get_collection()
    pipeline = _root_tree_aggregate_pipeline(match)
    cursor = taxon_coll.aggregate(
        pipeline
            )
    for doc in cursor:
        yield doc


def _iter_subtree_documents(root_taxid: str, rank_level: str):
    """
    Stream TaxonNode rows under ``root_taxid`` until ``rank_level``.
    Descending stops at nodes whose rank matches ``rank_level``.
    """
    taxon_coll = TaxonNode._get_collection()
    selected, _ = _collect_subtree_taxids(root_taxid, rank_level)
    if not selected:
        return

    pipeline = _root_tree_aggregate_pipeline({"taxid": {"$in": list(selected)}})
    for doc in taxon_coll.aggregate(pipeline):
        yield doc


def get_subtree_lookup(root_taxid: str, rank_level: str) -> dict:
    """
    Cached subtree preview stats for the same query semantics as subtree API.
    Returns total nodes selected and leaves within selected nodes.
    """
    normalized_rank = _normalize_rank(rank_level)
    cache_key = f"cached_tree_lookup_{root_taxid}_{normalized_rank}_v1"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    selected, children_map = _collect_subtree_taxids(root_taxid, normalized_rank)
    selected_ids = set(selected)
    total_nodes = len(selected_ids)
    total_leaves = 0
    for taxid in selected_ids:
        node = children_map.get(taxid) or {}
        children = node.get("children") or []
        has_selected_child = any(child in selected_ids for child in children)
        if not has_selected_child:
            total_leaves += 1

    result = {
        "taxid": str(root_taxid).strip(),
        "rank_level": normalized_rank,
        "total_nodes": total_nodes,
        "total_leaves": total_leaves,
    }
    cache.set(cache_key, result, timeout=3600)
    return result


def get_subtree_table(root_taxid: str, rank_level: str) -> dict:
    """
    Cached {fields, rows} table for a subtree rooted at ``root_taxid`` and
    truncated at nodes of ``rank_level``.
    """
    cache_key = f"cached_tree_table_{root_taxid}_{_normalize_rank(rank_level)}_v1"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    fields = list(ROOT_TREE_FIELDS)
    rows = []
    for doc in _iter_subtree_documents(root_taxid, rank_level):
        rows.append([doc.get(f) for f in fields])

    result = {"fields": fields, "rows": rows}
    cache.set(cache_key, result, timeout=3600)
    return result


def get_root_tree_table() -> dict:
    """
    Cached {fields, rows} for JSON clients. Materializes all rows in memory once per cache window.
    """
    cache_key = f"cached_root_tree_table_{ROOT_NODE}_v4"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    fields = list(ROOT_TREE_FIELDS)
    rows = []
    for doc in iter_root_tree_documents():
        rows.append([doc.get(f) for f in fields])

    result = {"fields": fields, "rows": rows}
    cache.set(cache_key, result, timeout=3600)
    return result


def stream_root_tree_jsonl():
    """Generator of NDJSON lines (no full-tree buffer)."""
    for doc in iter_root_tree_documents():
        yield json.dumps(doc, ensure_ascii=False) + "\n"


def stream_root_tree_tsv():
    """Generator of TSV chunks (header first); uses csv for safe escaping."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t", lineterminator="\n")
    writer.writerow(ROOT_TREE_FIELDS)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)
    # TODO: add buffer size to speed up the stream
    for doc in iter_root_tree_documents():
        row = []
        for f in ROOT_TREE_FIELDS:
            val = doc.get(f)
            row.append("" if val is None else val)
        writer.writerow(row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


def stream_subtree_jsonl(root_taxid: str, rank_level: str):
    """Generator of NDJSON lines for subtree output."""
    for doc in _iter_subtree_documents(root_taxid, rank_level):
        yield json.dumps(doc, ensure_ascii=False) + "\n"


def stream_subtree_tsv(root_taxid: str, rank_level: str):
    """Generator of TSV chunks (header first) for subtree output."""
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t", lineterminator="\n")
    writer.writerow(ROOT_TREE_FIELDS)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)
    for doc in _iter_subtree_documents(root_taxid, rank_level):
        row = []
        for f in ROOT_TREE_FIELDS:
            val = doc.get(f)
            row.append("" if val is None else val)
        writer.writerow(row)
        yield output.getvalue()
        output.seek(0)
        output.truncate(0)


def root_tree_response(fmt: str) -> Response:
    """
    Build a Flask response for the root taxonomy table.
    fmt: 'json' | 'jsonl' | 'tsv'
    """
    f = (fmt or "json").strip().lower()
    if f == "json":
        payload = get_root_tree_table()
        return Response(
            json.dumps(payload),
            mimetype="application/json",
        )
    if f == "jsonl":
        return Response(
            stream_root_tree_jsonl(),
            mimetype="application/x-ndjson",
            headers={"X-Content-Type-Options": "nosniff"},
        )
    if f in ("tsv", "tab"):
        return Response(
            stream_root_tree_tsv(),
            mimetype="text/tab-separated-values; charset=utf-8",
            headers={"X-Content-Type-Options": "nosniff"},
        )
    raise BadRequest(
        description="Invalid format; use format=json, format=jsonl, or format=tsv"
    )


def subtree_tree_response(fmt: str, root_taxid: str, rank_level: str) -> Response:
    """
    Build a Flask response for a subtree rooted at ``root_taxid``, capped at
    descendants with rank ``rank_level``.
    fmt: 'json' | 'jsonl' | 'tsv'
    """
    f = (fmt or "json").strip().lower()
    if f == "json":
        payload = get_subtree_table(root_taxid, rank_level)
        return Response(
            json.dumps(payload),
            mimetype="application/json",
        )
    if f == "jsonl":
        return Response(
            stream_subtree_jsonl(root_taxid, rank_level),
            mimetype="application/x-ndjson",
            headers={"X-Content-Type-Options": "nosniff"},
        )
    if f in ("tsv", "tab"):
        return Response(
            stream_subtree_tsv(root_taxid, rank_level),
            mimetype="text/tab-separated-values; charset=utf-8",
            headers={"X-Content-Type-Options": "nosniff"},
        )
    raise BadRequest(
        description="Invalid format; use format=json, format=jsonl, or format=tsv"
    )


def get_closest_taxon(requested_taxid):
    taxon = TaxonNode.objects(taxid=requested_taxid).exclude("id").first()

    if taxon:
        return taxon, 200

    organism, parsed_taxons = organism_helper.retrieve_taxonomic_info(requested_taxid)
    if not organism:
        return f"Taxon with taxid {requested_taxid} not found in INSDC", 400

    existing_taxons = TaxonNode.objects(
        taxid__in=[node.taxid for node in parsed_taxons]
    ).exclude("id")

    for node in parsed_taxons:
        node_taxid = node.taxid
        for ex_taxon in existing_taxons:
            if node_taxid == ex_taxon.taxid:
                return ex_taxon, 200
    return f"No matching taxon in tree for taxid {requested_taxid}", 404
