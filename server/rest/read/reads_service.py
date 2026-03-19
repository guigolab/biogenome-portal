import json
from typing import Any, Dict, List, Optional

from clients import ebi_client
from db.models import ReadRun
from helpers import biosample as biosample_helper, data as data_helper, organism as organism_helper
from parsers.read import parse_read_from_ena_portal
from werkzeug.exceptions import BadRequest
from rest.common.service_utils import get_or_404


def _ena_filereport_rows(response: Any) -> List[dict]:
    """Normalize ENA read_run filereport JSON into a list of row dicts."""
    if not response:
        return []
    if isinstance(response, list):
        return [r for r in response if isinstance(r, dict)]
    if isinstance(response, dict):
        for key in ("run", "read_run", "read_runs", "data"):
            chunk = response.get(key)
            if isinstance(chunk, list):
                return [r for r in chunk if isinstance(r, dict)]
        if response.get("run_accession") is not None:
            return [response]
    return []


def get_read_runs(args):
    return data_helper.get_items("reads", args)


def get_read_run(run_accession: str) -> ReadRun:
    return get_or_404(ReadRun, f"Read run {run_accession} not found!", run_accession=run_accession)


def get_read_runs_by_experiment(experiment_accession: str, args):
    runs = ReadRun.objects(experiment_accession=experiment_accession).exclude("id")
    fields = ['run_accession', 'experiment_accession', 'sample_accession', 'taxid', 'scientific_name']
    return data_helper.get_related_items(
        runs,
        args,
        fields=fields,
        allowed_fields=fields + ['metadata', 'taxon_lineage'],
        default_sort_column='run_accession',
    )


def create_read_runs_from_ena_accession(accession: str) -> str:
    """
    Fetch ENA read_run filereport for the given accession (experiment, sample, study, etc.)
    and upsert ReadRun documents.
    """
    raw = ebi_client.get_reads(accession)
    rows = _ena_filereport_rows(raw)
    if not rows:
        raise BadRequest(
            description=f"No read_run filereport data from INSDC for accession {accession!r}"
        )

    taxids_to_refresh = set()
    parsed_runs = []
    for row in rows:
        try:
            rr = parse_read_from_ena_portal(row)
        except Exception as exc:
            raise BadRequest(description=f"Invalid filereport row: {exc}") from exc
        if rr.run_accession and rr.taxid and rr.sample_accession:
            parsed_runs.append(rr)

    if not parsed_runs:
        raise BadRequest(
            description=f"No valid read_run entries found for accession {accession!r}"
        )

    existing_runs = ReadRun.objects(
        run_accession__in=[rr.run_accession for rr in parsed_runs]
    ).only("run_accession", "scientific_name")
    existing_by_accession = {run.run_accession: run for run in existing_runs}

    organism_cache: Dict[str, Optional[Any]] = {}
    biosample_cache: Dict[str, Optional[Any]] = {}

    for rr in parsed_runs:
        taxid = str(rr.taxid)
        if taxid not in organism_cache:
            organism_cache[taxid] = organism_helper.handle_organism(rr.taxid)
        organism_obj = organism_cache[taxid]
        if not organism_obj:
            continue

        sample_accession = str(rr.sample_accession)
        if sample_accession not in biosample_cache:
            biosample_cache[sample_accession] = biosample_helper.handle_biosample(rr.sample_accession)
        biosample_obj = biosample_cache[sample_accession]
        if not biosample_obj:
            continue

        existing = existing_by_accession.get(rr.run_accession)
        if existing:
            existing.update(
                set__metadata=rr.metadata,
                set__experiment_accession=rr.experiment_accession,
                set__taxid=rr.taxid,
                set__scientific_name=rr.scientific_name or existing.scientific_name,
                set__sample_accession=rr.sample_accession,
            )
            data_helper.update_lineage(existing, organism_obj)
        else:
            rr.save()
            data_helper.update_lineage(rr, organism_obj, skip_sync=True)
            existing_by_accession[rr.run_accession] = rr

        taxids_to_refresh.add(taxid)

    if not taxids_to_refresh:
        raise BadRequest(
            description=f"Could not import any read runs for {accession!r} (missing organism/biosample in portal?)"
        )

    # Per-row save/update_lineage already refreshed organism status + taxon counts

    return accession


def delete_read_run(run_accession: str) -> str:
    run = get_read_run(run_accession)
    run.delete()
    return run_accession


def experiments_gone_response():
    """410 payload for deprecated /api/experiments routes."""
    body = {
        "error": "gone",
        "message": "The /api/experiments API has been removed. Use /api/reads instead.",
        "replacement": {
            "list": "/api/reads",
            "query": "/api/reads/query",
            "detail": "/api/reads/<run_accession>",
            "by_experiment": "/api/reads/by-experiment/<experiment_accession>",
            "import": "/api/reads/import/<accession>",
        },
    }
    return json.dumps(body), "application/json", 410
