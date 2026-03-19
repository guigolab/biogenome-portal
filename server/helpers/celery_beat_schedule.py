"""
Load Celery Beat schedule from JSON (for volume-mounted config).

Schema (object keyed by schedule entry name, same shape as Celery beat_schedule):

{
  "my-entry-name": {
    "task": "task_name_registered_with_celery",
    "schedule": { "type": "crontab", "minute": "*", "hour": "0" }
  }
}

Optional "args" (array) and "kwargs" (object) are passed to the task.

schedule types:
  - crontab: { "type": "crontab", ... } — kwargs forwarded to celery.schedules.crontab
  - interval: { "type": "interval", "seconds": <number> } (or minutes / hours)

Alternatively, wrap entries in a top-level "beat_schedule" key.
"""

from __future__ import annotations

import json
import logging
import os
from datetime import timedelta
from typing import Any, Dict, Mapping, MutableMapping, Union

from celery.schedules import crontab

logger = logging.getLogger(__name__)

ScheduleSpec = Union[Mapping[str, Any], int, float]


def _parse_schedule(spec: ScheduleSpec):
    if spec is None:
        raise ValueError("schedule is required for each beat entry")

    if isinstance(spec, (int, float)):
        return timedelta(seconds=float(spec))

    if not isinstance(spec, Mapping):
        raise TypeError(f"schedule must be object or number, got {type(spec)!r}")

    stype = spec.get("type", "crontab")
    if stype == "crontab":
        crontab_kwargs = {k: v for k, v in spec.items() if k != "type"}
        return crontab(**crontab_kwargs)

    if stype == "interval":
        if "seconds" in spec:
            return timedelta(seconds=float(spec["seconds"]))
        if "minutes" in spec:
            return timedelta(minutes=float(spec["minutes"]))
        if "hours" in spec:
            return timedelta(hours=float(spec["hours"]))
        raise ValueError('interval schedule needs "seconds", "minutes", or "hours"')

    raise ValueError(f'unknown schedule type: {stype!r}')


def load_beat_schedule_from_json_file(path: str | None) -> Dict[str, Any]:
    """
    Read beat_schedule dict from JSON file. Returns {} if path is missing or file absent.
    """
    if not path:
        return {}

    if not os.path.isfile(path):
        logger.warning("Celery beat schedule file not found at %s — beat_schedule is empty", path)
        return {}

    with open(path, encoding="utf-8") as f:
        data = json.load(f)

    if not isinstance(data, Mapping):
        raise ValueError("beat schedule JSON must be an object")

    if "beat_schedule" in data:
        entries = data["beat_schedule"]
    else:
        entries = data

    if not isinstance(entries, Mapping):
        raise ValueError("beat_schedule entries must be an object")

    out: Dict[str, Any] = {}
    for name, entry in entries.items():
        if not isinstance(entry, Mapping):
            logger.warning("Skipping beat entry %r: expected object, got %s", name, type(entry))
            continue

        if "task" not in entry:
            logger.warning("Skipping beat entry %r: missing task", name)
            continue

        item: MutableMapping[str, Any] = {
            "task": entry["task"],
            "schedule": _parse_schedule(entry.get("schedule")),
        }
        if "args" in entry:
            item["args"] = tuple(entry["args"])
        if "kwargs" in entry:
            item["kwargs"] = dict(entry["kwargs"])

        out[str(name)] = dict(item)

    return out
