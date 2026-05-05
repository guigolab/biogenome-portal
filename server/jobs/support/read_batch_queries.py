"""
Batched ReadRun Mongo lookups for large reads/bioproject imports.

Keeps Mongo ``$in`` sizes bounded (~200k runs per project).
"""

from __future__ import annotations

from typing import Any, Dict, List, Set, Tuple

from db.model import ReadRun
from helpers.data import create_batches
from jobs.support.ingest_job_utils import dedupe_nonempty_strs
from parsers.read import READRUN_TAXID_PENDING

RUN_ACCESSION_QUERY_BATCH = 5000


def biosample_related_maps_from_run_accessions(
    run_accessions: List[str],
    *,
    batch_size: int = RUN_ACCESSION_QUERY_BATCH,
) -> Tuple[Dict[str, str], List[str]]:
    """
    First biosample accession per sample wins in ``run_accessions`` list order.
    """
    related_id_by_biosample: Dict[str, str] = {}
    biosample_accessions_ordered: List[str] = []
    if not run_accessions:
        return related_id_by_biosample, biosample_accessions_ordered

    for chunk in create_batches(run_accessions, batch_size):
        chunk_list = list(chunk)
        runs = list(
            ReadRun.objects(run_accession__in=chunk_list).only(
                "run_accession", "sample_accession"
            )
        )
        by_acc = {
            str(r.run_accession).strip(): r
            for r in runs
            if getattr(r, "run_accession", None)
        }
        for acc in chunk_list:
            rr = by_acc.get(str(acc).strip())
            if not rr:
                continue
            sa = rr.sample_accession
            if sa and sa not in related_id_by_biosample:
                related_id_by_biosample[sa] = rr.run_accession
                biosample_accessions_ordered.append(sa)
    return related_id_by_biosample, biosample_accessions_ordered


def unique_taxids_for_taxonomy_from_run_accessions(
    run_accessions: List[str],
    *,
    batch_size: int = RUN_ACCESSION_QUERY_BATCH,
) -> List[str]:
    found: Set[str] = set()
    if not run_accessions:
        return []
    for chunk in create_batches(run_accessions, batch_size):
        for t in ReadRun.objects(run_accession__in=list(chunk)).scalar("taxid"):
            if t is None:
                continue
            s = str(t).strip()
            if not s or s == READRUN_TAXID_PENDING:
                continue
            found.add(s)
    return sorted(found)


def run_accessions_still_in_database(
    run_accessions: List[str],
    *,
    batch_size: int = RUN_ACCESSION_QUERY_BATCH,
) -> List[str]:
    if not run_accessions:
        return []
    scalars: List[Any] = []
    for chunk in create_batches(run_accessions, batch_size):
        scalars.extend(
            ReadRun.objects(run_accession__in=list(chunk)).scalar("run_accession")
        )
    return dedupe_nonempty_strs(scalars)
