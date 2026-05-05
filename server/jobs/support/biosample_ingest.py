"""
Multi-tier BioSample resolution for assembly and read import pipelines.

Resolution order for each unseen accession:
  1. NCBI datasets metadata embedded in the assembly JSONL row
     (``assembly_info.biosample``).
  2. ENA bulk XML gzip (existing ``fetch_new_biosamples_from_ebi_portal``).
  3. EBI BioSamples API per-accession REST call.
  4. NCBI Entrez efetch (``db=biosample``).

Accessions still unresolved after all tiers are recorded in
``BioSampleFetchFailure`` for ops visibility; records are cleared
when an accession is eventually resolved.

Entry point: ``resolve_biosamples_for_accessions``.
"""

from __future__ import annotations

import datetime
import logging
from typing import Any, Dict, List, Optional

from mongoengine.errors import NotUniqueError, ValidationError

from clients import ebi_client
from clients.ncbi_entrez_biosample import fetch_biosample_docs_for_accessions
from db.model import BioSample, BioSampleFetchFailure
from helpers.data import create_batches
from parsers import biosample as biosample_parser
from parsers.biosample_from_ncbi_datasets import parse_biosample_from_assembly_dict

from .biosample_bulk import fetch_new_biosamples_from_ebi_portal

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Shared bulk-insert helper
# ---------------------------------------------------------------------------

def _bulk_insert_biosample_documents(docs: List[BioSample]) -> List[str]:
    """
    Bulk-insert a list of ``BioSample`` documents.

    Falls back to per-document save/update on insert failure.  Returns the
    list of accessions that were either newly inserted or updated in this call.
    """
    if not docs:
        return []

    by_accession: Dict[str, BioSample] = {}
    for doc in docs:
        if doc.accession:
            by_accession[doc.accession] = doc
    to_insert = list(by_accession.values())
    if not to_insert:
        return []

    saved: List[str] = []
    try:
        BioSample.objects.insert(to_insert)
        saved = [d.accession for d in to_insert if d.accession]
        logger.info("Bulk inserted %d new BioSample document(s)", len(to_insert))
    except Exception:
        logger.exception(
            "Bulk BioSample insert failed (size %d); falling back to per-document save",
            len(to_insert),
        )
        for doc in to_insert:
            acc = doc.accession
            if not acc:
                continue
            try:
                doc.save()
                saved.append(acc)
            except (NotUniqueError, ValidationError):
                try:
                    BioSample.objects(accession=acc).update(
                        taxid=doc.taxid,
                        scientific_name=doc.scientific_name,
                        metadata=doc.metadata,
                    )
                    saved.append(acc)
                    logger.debug("BioSample %s already existed; updated metadata", acc)
                except Exception:
                    logger.exception("Failed to update duplicate BioSample %s", acc)
            except Exception:
                logger.exception("Failed to save BioSample %s", acc)
    return saved


# ---------------------------------------------------------------------------
# Failure audit helpers
# ---------------------------------------------------------------------------

def _record_fetch_failures(
    accessions: List[str],
    related_kind: str,
    related_id_by_biosample: Dict[str, str],
    error_msg: str = "all tiers exhausted",
) -> None:
    if not accessions:
        return
    now = datetime.datetime.utcnow()
    coll = BioSampleFetchFailure._get_collection()
    for acc in accessions:
        related_id = related_id_by_biosample.get(acc, "")
        try:
            coll.update_one(
                {
                    "biosample_accession": acc,
                    "related_model": related_kind,
                    "related_id": related_id,
                },
                {
                    "$set": {
                        "last_attempt_at": now,
                        "last_error": error_msg,
                    },
                    "$inc": {"attempt_count": 1},
                },
                upsert=True,
            )
        except Exception:
            logger.exception(
                "Failed to record BioSampleFetchFailure for %s (%s %s)",
                acc,
                related_kind,
                related_id,
            )


def _clear_fetch_failures(accessions: List[str]) -> None:
    if not accessions:
        return
    try:
        BioSampleFetchFailure._get_collection().delete_many(
            {"biosample_accession": {"$in": accessions}}
        )
    except Exception:
        logger.exception("Failed to clear BioSampleFetchFailure records for %d accessions", len(accessions))


# ---------------------------------------------------------------------------
# Per-tier helpers
# ---------------------------------------------------------------------------

def _tier1_from_metadata(
    accessions: List[str],
    assembly_by_biosample: Dict[str, Dict[str, Any]],
) -> Dict[str, BioSample]:
    """Return ``{accession: BioSample}`` for all accessions parseable from assembly metadata."""
    result: Dict[str, BioSample] = {}
    for acc in accessions:
        row = assembly_by_biosample.get(acc)
        if not row:
            continue
        try:
            doc = parse_biosample_from_assembly_dict(row)
            if doc is not None and doc.accession == acc:
                result[acc] = doc
        except Exception:
            logger.exception("Tier-1 metadata parse failed for BioSample %s", acc)
    return result


def _tier3_ebi_per_accession(accessions: List[str]) -> Dict[str, BioSample]:
    """Return ``{accession: BioSample}`` fetched one-by-one from EBI BioSamples API."""
    result: Dict[str, BioSample] = {}
    for acc in accessions:
        try:
            raw = ebi_client.get_sample_from_biosamples(acc)
            if not raw:
                continue
            doc = biosample_parser.parse_biosample_from_ebi_data(raw)
            if doc and doc.accession:
                result[doc.accession] = doc
        except Exception:
            logger.exception("Tier-3 EBI BioSamples API fetch failed for %s", acc)
    return result


def _tier4_ncbi_entrez(accessions: List[str]) -> Dict[str, BioSample]:
    """Return ``{accession: BioSample}`` fetched from NCBI Entrez efetch."""
    if not accessions:
        return {}
    docs = fetch_biosample_docs_for_accessions(accessions)
    return {doc.accession: doc for doc in docs if doc.accession}


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def resolve_biosamples_for_accessions(
    accessions: List[str],
    tmp_dir: str,
    *,
    assembly_by_biosample: Optional[Dict[str, Dict[str, Any]]] = None,
    related_kind: str = "Assembly",
    related_id_by_biosample: Optional[Dict[str, str]] = None,
) -> List[str]:
    """
    Resolve and persist BioSample documents for the given accessions.

    Falls through four tiers until each accession is resolved:
      1. NCBI datasets assembly metadata (only when ``assembly_by_biosample``
         is provided and contains the accession).
      2. ENA bulk XML gzip (batched; up to 5 000 per request).
      3. EBI BioSamples API (per-accession REST call).
      4. NCBI Entrez efetch.

    Unresolved accessions are written to ``BioSampleFetchFailure``.
    Previously-failed accessions that resolve in this run have their audit
    records cleared.

    Returns the list of biosample accessions **newly persisted** in this run
    (for downstream geolocation and catalog finalization).
    """
    if assembly_by_biosample is None:
        assembly_by_biosample = {}
    if related_id_by_biosample is None:
        related_id_by_biosample = {}

    # 1. Deduplicate (stable order) and drop already-existing rows.
    deduped = list(dict.fromkeys(a for a in accessions if a and str(a).strip()))
    if not deduped:
        return []

    existing = set(BioSample.objects(accession__in=deduped).scalar("accession"))
    pending = [a for a in deduped if a not in existing]
    if not pending:
        return []

    all_saved: List[str] = []

    # --- Tier 1: NCBI datasets assembly metadata ---
    t1_resolved = _tier1_from_metadata(pending, assembly_by_biosample)
    if t1_resolved:
        saved = _bulk_insert_biosample_documents(list(t1_resolved.values()))
        all_saved.extend(saved)
        logger.info("Tier-1 (assembly metadata): resolved %d BioSample(s)", len(saved))
    pending = [a for a in pending if a not in t1_resolved]

    # --- Tier 2: ENA bulk XML ---
    if pending:
        t2_docs = fetch_new_biosamples_from_ebi_portal(pending, tmp_dir)
        t2_resolved = {doc.accession: doc for doc in t2_docs if doc.accession}
        if t2_resolved:
            saved = _bulk_insert_biosample_documents(list(t2_resolved.values()))
            all_saved.extend(saved)
            logger.info("Tier-2 (ENA bulk XML): resolved %d BioSample(s)", len(saved))
        pending = [a for a in pending if a not in t2_resolved]

    # --- Tier 3: EBI BioSamples REST per-accession ---
    if pending:
        t3_resolved = _tier3_ebi_per_accession(pending)
        if t3_resolved:
            saved = _bulk_insert_biosample_documents(list(t3_resolved.values()))
            all_saved.extend(saved)
            logger.info("Tier-3 (EBI per-accession): resolved %d BioSample(s)", len(saved))
        pending = [a for a in pending if a not in t3_resolved]

    # --- Tier 4: NCBI Entrez efetch ---
    if pending:
        t4_resolved = _tier4_ncbi_entrez(pending)
        if t4_resolved:
            saved = _bulk_insert_biosample_documents(list(t4_resolved.values()))
            all_saved.extend(saved)
            logger.info("Tier-4 (NCBI Entrez): resolved %d BioSample(s)", len(saved))
        pending = [a for a in pending if a not in t4_resolved]

    # --- Failures ---
    if pending:
        logger.warning(
            "resolve_biosamples_for_accessions: %d accession(s) unresolved after all tiers "
            "(related_kind=%s); recording in BioSampleFetchFailure.",
            len(pending),
            related_kind,
        )
        _record_fetch_failures(pending, related_kind, related_id_by_biosample)

    # Clear any previous failure records for accessions that were resolved.
    if all_saved:
        _clear_fetch_failures(all_saved)

    return all_saved
