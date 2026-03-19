import logging
import os
from typing import Dict, List, Optional

from jobs import assemblies, biosamples, geolocation, organisms, reads, taxonomy
from werkzeug.exceptions import BadRequest, NotFound

logger = logging.getLogger(__name__)

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'


JOB_MODELS = {
    'biosamples': {
        'import': biosamples.import_biosamples_from_project_names,
        'parents': biosamples.get_biosample_parents,
        'derived_from': biosamples.get_biosamples_derived_from_parent,
    },
    'reads': {
        'import': reads.get_reads_from_bioproject_accession,
        'cleanup_deprecated': reads.clean_up_deprecated_models,
    },
    'assemblies': {
        'import': assemblies.import_assemblies_by_bioproject,
        'blob_link': assemblies.add_blob_link,
        'accessions_import': assemblies.import_assemblies_from_accessions,
    },
    'helpers': {
        'handle_orphans': taxonomy.handle_orphan_organisms,
        'backfill_taxon_parents': taxonomy.backfill_taxon_parents_and_refresh_counts,
        'unset_taxon_node_leaves': taxonomy.unset_taxon_node_leaves_field,
    },
    'organisms': {
        'fetch_tolid_prefixes': organisms.fetch_tolid_prefixes_task,
    },
    'geo_locations': {
        'create_from_local_samples': geolocation.create_local_sample_coordinates,
        'create_from_biosamples': geolocation.create_biosample_coordinates,
        'create_countries': geolocation.update_all_countries,
    },
}


def _reference_celery_app():
    """Any registered job shares the same Celery app instance."""
    return taxonomy.handle_orphan_organisms.app


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


def create_cronjob(model, action):
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
        result = task.delay()
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

