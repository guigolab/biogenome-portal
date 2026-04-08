"""
JBrowse-related API helpers: list assemblies that can be opened in the genome browser.

Eligible assemblies have at least one GenomeAnnotation and persisted chromosomes
(Assembly.chromosomes non-empty and/or Chromosome documents with metadata.assembly_accession).
"""

from __future__ import annotations

import json
from collections import defaultdict
from typing import Any, Dict, List

from db.model import Assembly, Chromosome, GenomeAnnotation
from helpers import query_visitors
from helpers.data import MODEL_MAPPER, _catalog_params_as_plain_dict, create_query
from helpers import resource_mixins as rm
from helpers.resource_mixins import document_to_json_payload
from helpers.service_utils import get_or_404
from services.jbrowse_browser_chromosomes import map_chromosome_documents_for_browser


def _eligible_assembly_accessions() -> frozenset:
    """Accessions that have ≥1 annotation and saved chromosome data."""
    annotated_raw = GenomeAnnotation.objects.distinct("assembly_accession")
    annotated = {str(a) for a in annotated_raw if a}
    if not annotated:
        return frozenset()

    coll = Chromosome._get_collection()
    chr_meta_raw = coll.distinct(
        "metadata.assembly_accession",
        {"metadata.assembly_accession": {"$exists": True, "$nin": [None, ""]}},
    )
    chr_meta = {str(x) for x in chr_meta_raw if x}

    list_asm = Assembly.objects(chromosomes__not__size=0).scalar("accession")
    from_list = {str(a) for a in list_asm if a}

    has_chr = chr_meta | from_list
    return frozenset(annotated & has_chr)


def get_jbrowse_sessions(immutable_dict) -> Dict[str, Any]:
    """
    Paginated assemblies eligible for JBrowse, with nested annotation summaries.

    Query params align with catalog list: limit, offset, filter, sort_column, sort_order,
    taxon_lineage, and other Assembly field filters supported by create_query.
    """
    eligible = _eligible_assembly_accessions()
    if not eligible:
        return {"total": 0, "data": []}

    params = _catalog_params_as_plain_dict(immutable_dict)
    args = dict(params)

    filter_text = args.pop("filter", None)
    q_query = query_visitors.assembly_query(filter_text) if filter_text else None

    limit, offset = rm.get_pagination(args)
    sort_column, sort_order = rm.get_sort(args)
    if not sort_column:
        sort_column = MODEL_MAPPER["assemblies"]["default_sort_column"]
        sort_order = MODEL_MAPPER["assemblies"].get("default_sort_order", "asc")

    args.pop("format", None)
    args.pop("fields", None)

    query, q_query = create_query(args, q_query)

    items = Assembly.objects(accession__in=list(eligible))
    if query:
        items = items.filter(**query)
    if q_query is not None:
        items = items.filter(q_query)

    if sort_column and sort_order:
        sort_key = "-" + sort_column if sort_order == "desc" else sort_column
        items = items.order_by(sort_key)

    total = items.count()
    page = list(items.skip(offset).limit(limit))

    if not page:
        return {"total": total, "data": []}

    page_accessions = [a.accession for a in page]
    anns = (
        GenomeAnnotation.objects(assembly_accession__in=page_accessions)
        .only("name", "gff_gz_location", "tab_index_location", "assembly_accession")
        .order_by("name")
    )

    by_asm: Dict[str, List[Dict[str, str]]] = defaultdict(list)
    for ann in anns:
        acc = ann.assembly_accession
        if not acc:
            continue
        by_asm[str(acc)].append(
            {
                "name": ann.name,
                "gff_gz_location": ann.gff_gz_location or "",
                "tab_index_location": ann.tab_index_location or "",
            }
        )

    data: List[Dict[str, Any]] = []
    for asm in page:
        acc = asm.accession
        data.append(
            {
                "accession": acc,
                "assembly_name": asm.assembly_name,
                "scientific_name": asm.scientific_name,
                "taxid": asm.taxid,
                "annotations": by_asm.get(str(acc), []),
            }
        )

    return {"total": total, "data": data}


def get_genome_browser_context(accession: str) -> Dict[str, Any]:
    """
    Single payload for the genome browser: assembly document + sorted chromosomes
    with jbrowse_ref_name / length_bp + annotation rows (same shape as catalog lists).

    Contig display names for JBrowse and the UI are computed only in
    ``jbrowse_browser_chromosomes.map_chromosome_documents_for_browser`` (field
    ``jbrowse_ref_name``). The client must not re-derive ref names.
    """
    assembly_obj = get_or_404(Assembly, f"Assembly {accession} not found", accession=accession)

    chromosomes_qs = Chromosome.objects(metadata__assembly_accession=accession)
    if not chromosomes_qs.count():
        chromosomes_qs = Chromosome.objects(accession_version__in=assembly_obj.chromosomes)
    chromosomes_qs = chromosomes_qs.exclude("id")
    chr_list = list(chromosomes_qs.no_cache().only("accession_version", "metadata"))

    chromosomes_data = map_chromosome_documents_for_browser(chr_list, str(accession))

    anns = (
        GenomeAnnotation.objects(assembly_accession=accession)
        .exclude("id", "created")
        .order_by("name")
        .limit(500)
    )
    annotations_data: List[Dict[str, Any]] = []
    for ann in anns:
        row: Dict[str, Any] = {
            "name": ann.name,
            "gff_gz_location": ann.gff_gz_location or "",
            "tab_index_location": ann.tab_index_location or "",
        }
        if ann.assembly_name:
            row["assembly_name"] = ann.assembly_name
        if ann.metadata:
            row["metadata"] = dict(ann.metadata)
        annotations_data.append(row)

    assembly_dict = json.loads(document_to_json_payload(assembly_obj))

    return {
        "assembly": assembly_dict,
        "chromosomes": chromosomes_data,
        "annotations": annotations_data,
    }
