import logging
import os
from typing import Dict, List, Optional

from jobs import (
    annotrieve,
    assemblies,
    biosamples,
    catalog_counts,
    organism_images,
    organism_tsv_import,
    organisms,
    reads,
    taxonomy,
)
from werkzeug.exceptions import BadRequest, NotFound

logger = logging.getLogger(__name__)

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'


JOB_MODELS = {
    'biosamples': {
        'import': biosamples.import_biosamples_from_project_names,
    },
    'reads': {
        'import': reads.get_reads_from_bioproject_accession,
        'cleanup_deprecated': reads.clean_up_deprecated_models,
    },
    'assemblies': {
        'import': assemblies.import_assemblies_by_bioproject,
        'accessions_import': assemblies.import_assemblies_from_accessions,
        'refetch_chromosome_reports': assemblies.refetch_chromosome_reports_for_empty_chromosomes,
    },
    'helpers': {
        'backfill_organism_lineage_rank_labels': organisms.backfill_organism_lineage_rank_labels,
        'compute_all_counts': catalog_counts.compute_all_counts_task,
        'import_organisms_from_tsv': organism_tsv_import.import_organisms_from_tsv_task,
        'unset_organism_insdc_status_and_images': organisms.unset_organism_insdc_status_and_images,
        'unset_taxon_node_legacy_fields': taxonomy.unset_taxon_node_legacy_fields,
        'refresh_taxonomy': taxonomy.refresh_taxonomy_recurrent,
    },
    'organisms': {
        'fetch_tolid_prefixes': organisms.fetch_tolid_prefixes_task,
        'fetch_external_images': organism_images.fetch_external_images_task,
        'fetch_iucn_redlist': organisms.fetch_iucn_redlist_task,
        'backfill_iucn_redlist': organisms.backfill_iucn_redlist_task,
        'backfill_genome_publication': organisms.backfill_genome_publication_task,
    },
    'annotations': {
        'import': annotrieve.import_annotations_from_annotrieve,
    },

}


def _reference_celery_app():
    """Any registered job shares the same Celery app instance."""
    return assemblies.import_assemblies_from_accessions.app


def get_task(model, action):
    model_entry = JOB_MODELS.get(model)
    if not model_entry:
        raise NotFound(description=f"Model {model!r} not found")
    task = model_entry.get(action)
    if not task:
        raise NotFound(description=f"Action {action!r} for model {model!r} not found")
    return task


def _inspect_tasks_flat(inspect_payload):
    """
    Celery inspect returns {worker_hostname: [task_dict, ...]} or None if unreachable.
    Normalize to a list with worker hostname on each item.
    """
    if not inspect_payload:
        return []
    out = []
    for worker, tasks in inspect_payload.items():
        if not tasks:
            continue
        for t in tasks:
            if not isinstance(t, dict):
                continue
            row = dict(t)
            row['worker'] = worker
            out.append(row)
    return out


def _task_dict_name(task_dict: dict) -> Optional[str]:
    """Resolve Celery task name from inspect() active/reserved vs scheduled row shapes."""
    if not isinstance(task_dict, dict):
        return None
    req = task_dict.get('request')
    if isinstance(req, dict):
        name = req.get('name')
        if name:
            return name
    return task_dict.get('name')


def _running_task_names():
    """
    Collect Celery-registered task names currently active, reserved, or scheduled.
    """
    app = _reference_celery_app()
    inspect = app.control.inspect()
    names = set()
    for payload in (inspect.active() or {}, inspect.reserved() or {}, inspect.scheduled() or {}):
        for _worker, tasks in payload.items():
            if not tasks:
                continue
            for t in tasks:
                name = _task_dict_name(t)
                if name:
                    names.add(name)
    return names


def create_cronjob(model, action, payload=None):
    task = get_task(model, action)
    celery_name = task.name

    try:
        running = _running_task_names()
        if celery_name in running:
            raise BadRequest(
                description=(
                    f"Task {celery_name!r} is already running (or queued). "
                    f"Poll GET /api/cronjob or GET /api/tasks/<task_id> before retrying."
                )
            )

        logger.info("Triggering Celery task %s (%s/%s)", celery_name, model, action)
        payload = payload if isinstance(payload, dict) else {}
        args = payload.get("args")
        kwargs = payload.get("kwargs")
        if args is None and kwargs is None:
            result = task.delay()
        else:
            call_args = list(args) if args is not None else []
            call_kwargs = dict(kwargs) if isinstance(kwargs, dict) else {}
            result = task.delay(*call_args, **call_kwargs)
        return {
            "task_id": result.id,
            "celery_task_name": celery_name,
            "model": model,
            "action": action,
            "message": f"Job {result.id} for {model}/{action} launched successfully",
            "status_url": f"/api/tasks/{result.id}",
        }

    except BadRequest:
        raise
    except NotFound:
        raise
    except Exception as e:
        message = f"Error executing job {model}/{action}: {e}"
        logger.exception(message)
        raise BadRequest(description=message) from e


def get_cronjobs():
    """
    Snapshot of worker queue state for admin dashboards / polling.
    """
    app = _reference_celery_app()
    inspect = app.control.inspect()
    active_raw = inspect.active()
    reserved_raw = inspect.reserved()
    scheduled_raw = inspect.scheduled()

    workers_reachable = any(
        x is not None for x in (active_raw, reserved_raw, scheduled_raw)
    )

    active = _inspect_tasks_flat(active_raw)
    reserved = _inspect_tasks_flat(reserved_raw)
    scheduled = _inspect_tasks_flat(scheduled_raw)

    return {
        "workers_reachable": workers_reachable,
        "active": active,
        "reserved": reserved,
        "scheduled": scheduled,
        "counts": {
            "active": len(active),
            "reserved": len(reserved),
            "scheduled": len(scheduled),
        },
    }


def list_job_routes() -> Dict[str, List[str]]:
    """Human-readable registry of POST /api/cronjob/<model>/<action> routes."""
    return {model: sorted(actions.keys()) for model, actions in JOB_MODELS.items()}

