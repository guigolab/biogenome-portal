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

# TaxonNode fields to project from MongoDB.  ``parent`` is the model field
# that maps to the output key ``parent_taxid``.
_TREE_QUERY_FIELDS = ("taxid", "parent", "name", "rank") + ROOT_TREE_COUNT_FIELDS

# Rows buffered per yielded TSV chunk (trades latency for fewer HTTP chunks).
_TSV_CHUNK_ROWS = 4000


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


def _tree_skip_taxids() -> list:
    """
    Return taxids of nodes that are *ancestors* of ROOT_NODE (i.e. documents
    whose ``children`` list contains ROOT_NODE).  These are excluded from the
    tree response so the client only sees the portal subtree.
    """
    if not ROOT_NODE:
        raise NotFound(description="ROOT_NODE not configured")
    return [
        n.taxid
        for n in TaxonNode.objects(children=ROOT_NODE).only("taxid").exclude("id")
    ]


def _taxon_node_to_tree_doc(node: TaxonNode) -> dict:
    """Map a TaxonNode queryset result to the canonical tree-row dict."""
    return {
        "taxid": node.taxid,
        "parent_taxid": node.parent or None,
        "name": node.name or None,
        "rank": node.rank or None,
        "organisms_count": node.organisms_count or None,
        "assemblies_count": node.assemblies_count or None,
        "reads_count": node.reads_count or None,
        "biosamples_count": node.biosamples_count or None,
        "local_samples_count": node.local_samples_count or None,
        "genome_annotations_count": node.genome_annotations_count or None,
    }


def iter_root_tree_documents(batch_size: int = 1000):
    """
    Stream TaxonNode rows as dicts using a MongoEngine queryset.

    Only ``_TREE_QUERY_FIELDS`` are fetched from MongoDB (minimal wire
    transfer).  ``batch_size`` controls the MongoDB cursor batch window to
    keep memory usage bounded while iterating large collections.
    """
    skip = _tree_skip_taxids()
    qs = TaxonNode.objects.only(*_TREE_QUERY_FIELDS).exclude("id")
    if skip:
        qs = qs.filter(taxid__nin=skip)
    for node in qs.batch_size(batch_size):
        yield _taxon_node_to_tree_doc(node)


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
    """
    Generator of buffered TSV chunks (header first).

    Rows are accumulated up to ``_TSV_CHUNK_ROWS`` before each yield to
    reduce HTTP chunking overhead without holding the full result in memory.
    """
    output = io.StringIO()
    writer = csv.writer(output, delimiter="\t", lineterminator="\n")
    writer.writerow(ROOT_TREE_FIELDS)
    yield output.getvalue()
    output.seek(0)
    output.truncate(0)

    row_count = 0
    for doc in iter_root_tree_documents():
        writer.writerow(["" if (v := doc.get(f)) is None else v for f in ROOT_TREE_FIELDS])
        row_count += 1
        if row_count >= _TSV_CHUNK_ROWS:
            yield output.getvalue()
            output.seek(0)
            output.truncate(0)
            row_count = 0

    if row_count > 0:
        yield output.getvalue()


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
