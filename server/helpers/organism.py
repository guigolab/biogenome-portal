"""
Single-organism creation and taxonomic lookup for REST services and shared callers.

Bulk ENA taxonomy import for Celery lives in ``jobs.support.catalog_taxonomy_bootstrap``.
"""

from typing import List

from pymongo import UpdateOne

from clients import ebi_client, ncbi_client
from db.model import Organism, TaxonNode
from helpers.taxonomy import (
    _taxid_match_values,
    ensure_taxon_nodes_for_organisms_lineages,
)
from parsers import organism as organism_parser
from parsers import taxonomy as taxonomy_parser


def _normalize_taxid(taxid):
    if taxid is None:
        return None
    s = str(taxid).strip()
    return s or None


def handle_organism(taxid):
    tid = _normalize_taxid(taxid)
    if not tid:
        return None
    organism_obj = Organism.objects(taxid=tid).first()
    if not organism_obj:
        organism_obj = create_organism_and_related_taxons(tid)
    return organism_obj


def create_organism_and_related_taxons(taxid):
    """
    Persist a new organism and related ``TaxonNode`` rows from external taxonomy sources.

    Does not run catalog denormalization (organism status, TaxonNode counts); callers must
    invoke ``sync_species_after_catalog_change`` (or job-level bulk sync) after their own writes.
    """
    tid = _normalize_taxid(taxid)
    if not tid:
        return None
    organism_obj, parsed_taxons = retrieve_taxonomic_info(tid)
    if not organism_obj:
        return None
    organism_obj.save()
    if parsed_taxons:
        _save_parsed_taxons_and_lineage_edges(parsed_taxons, organism_obj)
    return organism_obj


def _save_parsed_taxons_and_lineage_edges(parsed_taxons, organism_obj) -> None:
    """
    Insert new ``TaxonNode`` documents from the parser, then link consecutive lineage taxids
    via ``children`` / ``parent`` in one unordered bulk write (no per-edge ORM round trips).
    """
    if not parsed_taxons:
        return

    parsed_ids = [str(t.taxid) for t in parsed_taxons]
    expanded_parsed = _taxid_match_values(parsed_ids)
    existing = {
        str(x).strip()
        for x in TaxonNode.objects(taxid__in=expanded_parsed).scalar("taxid")
        if x is not None
    }
    to_insert = [t for t in parsed_taxons if str(t.taxid) not in existing]
    if to_insert:
        TaxonNode.objects.insert(to_insert)

    lineage = organism_obj.taxon_lineage or []
    if len(lineage) < 2:
        return

    ensure_taxon_nodes_for_organisms_lineages([organism_obj])

    lineage_ids = [str(x) for x in lineage if x is not None]
    expanded_lineage = _taxid_match_values(lineage_ids)
    present = {
        str(x).strip()
        for x in TaxonNode.objects(taxid__in=expanded_lineage).scalar("taxid")
        if x is not None
    }
    coll = TaxonNode._get_collection()
    ops: List[UpdateOne] = []
    for i in range(len(lineage_ids) - 1):
        child_tid = lineage_ids[i]
        parent_tid = lineage_ids[i + 1]
        if child_tid not in present or parent_tid not in present:
            continue
        ops.append(UpdateOne({"taxid": parent_tid}, {"$addToSet": {"children": child_tid}}))
        ops.append(UpdateOne({"taxid": child_tid}, {"$set": {"parent": parent_tid}}))
    if ops:
        coll.bulk_write(ops, ordered=False)


def retrieve_taxonomic_info(taxid):
    """
    Resolve taxonomy for ``taxid`` from several INSDC sources (first hit wins).

    Order (aligned with Celery taxonomy bootstrap fallbacks):
    ENA browser XML → ENA portal → NCBI datasets → ENA Taxonomy REST + browser.
    """
    tid = _normalize_taxid(taxid)
    if not tid:
        return None, None

    for getter in (
        get_info_from_ena_browser,
        get_info_from_ena_portal,
        get_info_from_ncbi,
        get_info_from_ena_taxonomy_rest_and_browser,
    ):
        organism_data, parsed_taxons = getter(tid)
        if organism_data:
            return organism_data, parsed_taxons or []

    return None, None


def get_info_from_ena_taxonomy_rest_and_browser(taxid):
    """
    ENA Taxonomy REST JSON confirms the taxon and supplies canonical names; ENA browser XML
    supplies lineage with stable taxids (REST lineage text is name-only).

    See https://www.ebi.ac.uk/ena/taxonomy/rest/tax-id/9606
    """
    tid = _normalize_taxid(taxid)
    if not tid:
        return None, None

    rest_doc = ebi_client.get_taxon_from_ena_taxonomy_rest(tid)
    if not rest_doc:
        return None, None

    taxon_xml = ebi_client.get_taxon_from_ena_browser(tid)
    if not taxon_xml:
        return None, None

    organism_to_parse, parsed_taxons = taxonomy_parser.parse_taxon_from_ena_browser(taxon_xml)
    organism_to_save = organism_parser.parse_organism_from_ena_browser(organism_to_parse, parsed_taxons)

    sn = rest_doc.get("scientificName")
    if sn:
        organism_to_save.scientific_name = sn
    cn = rest_doc.get("commonName")
    if cn:
        organism_to_save.insdc_common_name = cn

    return organism_to_save, parsed_taxons


def get_info_from_ncbi(taxid):
    tid = _normalize_taxid(taxid)
    if not tid:
        return None, None
    args = ["taxonomy", "taxon", tid, "--parents"]
    report = ncbi_client.get_data_from_ncbi(args)
    if not report or not report.get("reports"):
        return None, None
    organism_to_save = None
    for taxon_report in report.get("reports"):
        if str(taxon_report.get("tax_id")) == tid:
            organism_to_save = organism_parser.parse_organism_from_ncbi_dataset(taxon_report)
            break
    if not organism_to_save:
        return None, None
    parsed_taxons = taxonomy_parser.parse_taxons_from_ncbi_datasets(report.get("reports"))
    if not parsed_taxons:
        return None, None
    return organism_to_save, parsed_taxons


def get_info_from_ena_browser(taxid):
    tid = _normalize_taxid(taxid)
    if not tid:
        return None, None
    taxon_xml = ebi_client.get_taxon_from_ena_browser(tid)
    if not taxon_xml:
        return None, None
    organism_to_parse, parsed_taxons = taxonomy_parser.parse_taxon_from_ena_browser(taxon_xml)
    organism_to_save = organism_parser.parse_organism_from_ena_browser(organism_to_parse, parsed_taxons)
    return organism_to_save, parsed_taxons


def get_info_from_ena_portal(taxid):
    tid = _normalize_taxid(taxid)
    if not tid:
        return None, None
    taxon = ebi_client.get_taxon_from_ena_portal(tid)
    if not taxon:
        return None, None
    taxon_to_parse = taxon[0]
    organism_to_save = organism_parser.parse_organism_from_ena_portal(taxon_to_parse)
    parsed_taxons = [taxonomy_parser.parse_taxon_from_ena_portal(taxon_to_parse)]
    for lineage_taxid in organism_to_save.taxon_lineage:
        if str(lineage_taxid) == tid:
            continue
        lineage_taxon = ebi_client.get_taxon_from_ena_portal(lineage_taxid)
        if lineage_taxon:
            parsed_taxons.append(taxonomy_parser.parse_taxon_from_ena_portal(lineage_taxon[0]))
    return organism_to_save, parsed_taxons
