from db.models import Organism, TaxonNode
from helpers import organism as organism_helper, taxonomy as taxonomy_helper
from werkzeug.exceptions import NotFound, BadRequest
from flask import Response
from extensions.cache import cache
import csv
import io
import json
import os

ROOT_NODE = os.getenv("ROOT_NODE")

# Column order for table / TSV / JSONL (JSON uses same field names in each row object).
ROOT_TREE_COUNT_FIELDS = (
    "organisms_count",
    "assemblies_count",
    "reads_count",
    "biosamples_count",
    "local_samples_count",
    "submitted_biosamples_count",
    "genome_annotations_count",
)
ROOT_TREE_FIELDS = (
    "taxid",
    "parent_taxid",
    "name",
    "rank",
    "leaves",
    *ROOT_TREE_COUNT_FIELDS,
)


def _root_tree_match_skip() -> dict:
    """Match all TaxonNode docs under the portal root (exclude ancestors of ROOT_NODE)."""
    if not ROOT_NODE:
        raise NotFound(description="ROOT_NODE not configured")

    taxon_coll = TaxonNode._get_collection()
    skip_taxids = [
        doc["taxid"]
        for doc in taxon_coll.find({"children": ROOT_NODE}, {"taxid": 1})
    ]
    return {"taxid": {"$nin": skip_taxids}} if skip_taxids else {}


def _root_tree_aggregate_pipeline(match: dict) -> list:
    """Single scan: project parent + leaves + denormalized counts (no in-memory parent map)."""
    proj = {
        "_id": 0,
        "taxid": 1,
        "parent_taxid": "$parent",
        "name": {"$ifNull": ["$name", ""]},
        "rank": {"$ifNull": ["$rank", ""]},
        "leaves": {"$ifNull": ["$leaves", 0]},
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
        pipeline,
        allow_disk_use=True,
        batch_size=batch_size,
    )
    for doc in cursor:
        yield doc


def get_root_tree_table() -> dict:
    """
    Cached {fields, rows} for JSON clients. Materializes all rows in memory once per cache window.
    """
    cache_key = f"cached_root_tree_table_{ROOT_NODE}_v3"
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

    for doc in iter_root_tree_documents():
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

def get_closest_taxon(taxid):

    taxon = TaxonNode.objects(taxid=taxid).exclude("id").first()

    if taxon:
        return taxon, 200

    organism, parsed_taxons = organism_helper.retrieve_taxonomic_info(taxid)
    if not organism:
        return f"Taxon with taxid {taxid} not found in INSDC", 400

    existing_taxons = TaxonNode.objects(
        taxid__in=[node.taxid for node in parsed_taxons]
    ).exclude("id")

    for node in parsed_taxons:
        taxid = node.get("taxId")
        for ex_taxon in existing_taxons:
            if taxid == ex_taxon.taxid:
                return ex_taxon, 200
