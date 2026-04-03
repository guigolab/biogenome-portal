"""
ENA taxonomy bootstrap: fetch XML, parse organisms and TaxonNode rows, insert-only.

Does not run denormalization, lineage copy onto catalog collections, or ToLID.
"""

from __future__ import annotations

import gzip
import logging
import os
from typing import Any, Dict, List, Set, Tuple, Iterable

from lxml import etree

from clients import ebi_client
from db.model import Organism, TaxonNode
from helpers.data import create_batches
from helpers.organism import create_organism_and_related_taxons
from jobs.support.organism_catalog_guard import TAXID_LIST_LIMIT

logger = logging.getLogger(__name__)


def _insert_new_taxon_nodes_from_dict(taxons_dict: Dict[str, TaxonNode]) -> None:
    """Insert TaxonNode docs from a taxid -> TaxonNode mapping for ids not yet in DB."""
    if not taxons_dict:
        return
    existing = set(TaxonNode.objects(taxid__in=list(taxons_dict.keys())).scalar("taxid"))
    new_taxons = [taxon for taxid, taxon in taxons_dict.items() if taxid not in existing]
    if new_taxons:
        TaxonNode.objects.insert(new_taxons)


def parse_taxons_and_organisms_from_ena_browser(xml_path: str) -> Tuple[List[Organism], Dict[str, TaxonNode]]:
    """
    Stream-parse ENA taxonomy XML (gzipped), returning Organism docs and lineage TaxonNodes.

    Empty responses, invalid gzip, or non-XML payloads from ENA return ``([], {})`` after logging.
    """
    organisms: List[Organism] = []
    taxons_dict: Dict[str, TaxonNode] = {}
    try:
        with gzip.open(xml_path, "rb") as f:
            context = etree.iterparse(f, events=("end",))

            for _, elem in context:
                if elem.tag != "taxon":
                    continue

                parent = elem.getparent()
                if parent is None or parent.tag != "TAXON_SET":
                    continue

                taxid = elem.get("taxId")
                if not taxid:
                    elem.clear()
                    continue

                organism = Organism(
                    taxid=taxid,
                    scientific_name=elem.get("scientificName"),
                    insdc_common_name=elem.get("commonName"),
                    taxon_lineage=[taxid],
                )

                # 1:1 Organism ↔ TaxonNode at the organism taxid (tree leaf). Lineage children are
                # ancestors only; the primary <taxon> element was previously omitted from inserts.
                if taxid not in taxons_dict:
                    raw_rank = (elem.get("rank") or "").strip().lower() or "species"
                    taxons_dict[taxid] = TaxonNode(
                        taxid=taxid,
                        name=elem.get("scientificName") or "",
                        rank=raw_rank,
                    )

                lineage_elem = elem.find("lineage")
                if lineage_elem is not None:
                    for lt in lineage_elem.findall("taxon"):
                        lt_taxid = lt.get("taxId")
                        if not lt_taxid or lt.get("scientificName") == "root":
                            continue

                        organism.taxon_lineage.append(lt_taxid)
                        if lt_taxid not in taxons_dict:
                            taxons_dict[lt_taxid] = TaxonNode(
                                taxid=lt_taxid,
                                name=lt.get("scientificName"),
                                rank=lt.get("rank") or "other",
                            )

                organisms.append(organism)

                elem.clear()
                while elem.getprevious() is not None:
                    del elem.getparent()[0]
    except (OSError, etree.XMLSyntaxError, etree.ParseError) as exc:
        logger.warning(
            "Could not parse ENA taxonomy XML at %s: %s",
            xml_path,
            exc,
        )
        return [], {}
    except Exception:
        logger.exception("Unexpected error parsing ENA taxonomy XML at %s", xml_path)
        return [], {}

    return organisms, taxons_dict


def fetch_new_organisms(
    taxids: List[str],
    tmp_dir: str,
) -> Tuple[List[Organism], Dict[str, TaxonNode]]:
    """
    Fetch taxonomy XML from ENA browser API in batches (bulk), returning Organism docs
    and TaxonNode mapping. Callers should fall back to per-taxon providers for taxids
    missing from this response (see :func:`handle_full_taxonomy_from_taxids`).
    """
    batches = create_batches(taxids, TAXID_LIST_LIMIT)
    organisms: List[Organism] = []
    taxons_dict: Dict[str, TaxonNode] = {}
    for idx, batch in enumerate(batches):
        path = os.path.join(tmp_dir, f"taxons_{idx}_{len(batch)}.xml.gz")
        fetch_success = ebi_client.get_xml_from_ena_browser(batch, path)
        if not fetch_success:
            logger.warning(
                "ENA browser bulk taxonomy request failed for %s taxid(s): %s",
                len(batch),
                batch[:20] if len(batch) > 20 else batch,
            )
            continue
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            logger.warning(
                "ENA browser returned no XML data for %s taxid(s) (empty or missing file): %s",
                len(batch),
                batch[:20] if len(batch) > 20 else batch,
            )
            try:
                if os.path.exists(path):
                    os.remove(path)
            except OSError:
                pass
            continue
        new_organisms, new_taxons_dict = parse_taxons_and_organisms_from_ena_browser(path)
        if not new_organisms:
            logger.warning(
                "Bulk ENA taxonomy XML produced no taxon elements for requested taxid(s); "
                "will try per-taxon providers. Batch (sample): %s",
                batch[:20] if len(batch) > 20 else batch,
            )
        organisms.extend(new_organisms)
        taxons_dict.update(new_taxons_dict)
        try:
            os.remove(path)
        except OSError:
            pass
    return organisms, taxons_dict


def _disambiguate_scientific_names_for_organism_bulk(organisms: List[Organism]) -> None:
    """
    Ensure ``scientific_name`` values are unique for MongoDB's unique index.
    """
    if not organisms:
        return

    raw_names = {
        (o.scientific_name or "").strip()
        for o in organisms
        if (o.scientific_name or "").strip()
    }
    db_owners_by_lower: Dict[str, Set[str]] = {}
    if raw_names:
        for doc in Organism.objects(scientific_name__in=list(raw_names)).only(
            "taxid", "scientific_name"
        ):
            label = (doc.scientific_name or "").strip()
            if not label:
                continue
            db_owners_by_lower.setdefault(label.lower(), set()).add(str(doc.taxid).strip())

    claimed_plain_lower: Dict[str, str] = {}
    for o in organisms:
        tid = str(o.taxid).strip()
        base = (o.scientific_name or "").strip() or f"taxon {tid}"
        lower = base.lower()
        db_others = db_owners_by_lower.get(lower, set()) - {tid}
        peer_tid = claimed_plain_lower.get(lower)
        if not db_others and peer_tid is None:
            claimed_plain_lower[lower] = tid
            o.scientific_name = base
            continue
        if peer_tid == tid:
            o.scientific_name = base
            continue
        suffix = f" [NCBI:{tid}]"
        o.scientific_name = base + suffix if suffix not in base else base


def _fallback_create_organisms_for_taxids(taxids: List[str], saved_taxids: List[str]) -> None:
    """
    For each taxid, create Organism/TaxonNode via :func:`retrieve_taxonomic_info` chain
    (ENA browser → portal → NCBI → ENA REST) if no row exists yet.
    """
    for tid in taxids:
        if Organism.objects(taxid=tid).first():
            continue
        logger.info(
            "Single-taxon taxonomy import for taxid %s (retrieve_taxonomic_info providers)",
            tid,
        )
        org = create_organism_and_related_taxons(tid)
        if org:
            saved_taxids.append(tid)
            logger.info("Created organism for taxid %s via single-taxon providers", tid)
        else:
            logger.error(
                "Could not resolve taxonomy for taxid %s after bulk ENA and all providers",
                tid,
            )


def handle_full_taxonomy_from_taxids(
    taxids: Iterable[Any],
    tmp_dir: str,
) -> List[str]:
    """
    Insert missing Organism/TaxonNode rows for the given taxids.

    Uses ENA browser bulk XML first, then for any taxid still missing (empty/invalid bulk
    response or absent from XML) calls :func:`helpers.organism.create_organism_and_related_taxons`,
    which runs :func:`helpers.organism.retrieve_taxonomic_info` (ENA browser → ENA portal
    → NCBI → ENA Taxonomy REST + browser).

    After bulk Organism insert, runs :func:`bulk_copy_organism_lineages_to_catalog` for
    that batch so every lineage taxon is linked (``parent`` / ``children``) immediately.

    This helper does not run denormalization and does not schedule/fetch ToLID.
    """
    saved_taxids: List[str] = []
    batches = create_batches(list(taxids), TAXID_LIST_LIMIT)
    for batch in batches:
        existing_taxids = {
            str(x) for x in Organism.objects(taxid__in=batch).scalar("taxid") if x is not None
        }
        new_taxids: List[str] = []
        seen_new: Set[str] = set()
        for raw in batch:
            if raw is None:
                continue
            t = str(raw).strip()
            if not t or t in existing_taxids or t in seen_new:
                continue
            seen_new.add(t)
            new_taxids.append(t)
        if not new_taxids:
            continue

        organisms, taxons_dict = fetch_new_organisms(new_taxids, tmp_dir)
        bulk_taxids: Set[str] = {
            str(o.taxid).strip() for o in organisms if o.taxid is not None
        }
        missing_from_bulk = [t for t in new_taxids if t not in bulk_taxids]
        if missing_from_bulk:
            logger.warning(
                "Bulk ENA taxonomy XML did not include %s taxid(s): %s",
                len(missing_from_bulk),
                missing_from_bulk,
            )

        bulk_inserted = False
        if organisms:
            by_tid: Dict[str, Organism] = {}
            for org in organisms:
                if org.taxid is None:
                    continue
                tid = str(org.taxid).strip()
                if tid:
                    by_tid[tid] = org
            unique_orgs = list(by_tid.values())
            _disambiguate_scientific_names_for_organism_bulk(unique_orgs)
            try:
                Organism.objects.insert(unique_orgs)
                bulk_inserted = True
                saved_taxids.extend(
                    [str(org.taxid) for org in unique_orgs if org.taxid is not None]
                )
            except Exception:
                logger.exception(
                    "Bulk Organism insert failed for batch of %s; will try per-taxon import",
                    len(unique_orgs),
                )

        _insert_new_taxon_nodes_from_dict(taxons_dict)

        if bulk_inserted and unique_orgs:
            batch_species_tids = [
                str(o.taxid).strip()
                for o in unique_orgs
                if o.taxid is not None and str(o.taxid).strip()
            ]
            if batch_species_tids:
                # Lazy import avoids circular import (finalize imports this module).
                from jobs.support.organism_catalog_finalize import (
                    bulk_copy_organism_lineages_to_catalog,
                )

                bulk_copy_organism_lineages_to_catalog(batch_species_tids)

        _fallback_create_organisms_for_taxids(missing_from_bulk, saved_taxids)

        if organisms and not bulk_inserted:
            retry_taxids = sorted(bulk_taxids)
            logger.warning(
                "Retrying %s taxid(s) via single-taxon providers after bulk insert failure: %s",
                len(retry_taxids),
                retry_taxids,
            )
            _fallback_create_organisms_for_taxids(retry_taxids, saved_taxids)

    return saved_taxids
