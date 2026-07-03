import csv
import datetime
import json
import logging
from io import StringIO

from bson.json_util import JSONOptions, DatetimeRepresentation, dumps
from celery.result import AsyncResult
from flask import Response, request
from mongoengine import Document
from werkzeug.exceptions import BadRequest

from helpers import data as data_helper

DEFAULT_LIMIT = 10
DEFAULT_OFFSET = 0
MAX_LIMIT = 200

logger = logging.getLogger(__name__)


def read_payload(req=None):
    current_request = req or request
    return current_request.json if current_request.is_json else current_request.form


def build_response(payload, mimetype="application/json", status=200):
    return Response(payload, mimetype=mimetype, status=status)


def list_resource(model_key, params):
    payload, mimetype = data_helper.get_items(model_key, params)
    return build_response(payload, mimetype=mimetype, status=200)


def list_resource_from_args(model_key):
    return list_resource(model_key, request.args)


def list_resource_from_payload(model_key, req=None):
    return list_resource(model_key, read_payload(req=req))


def json_response(payload, status=200):
    return build_response(json.dumps(payload), mimetype="application/json", status=status)


def json_message(message, status=200, **extra):
    payload = {"message": message}
    payload.update(extra)
    return json_response(payload, status=status)


def _safe_int(value, field_name):
    try:
        return int(value)
    except (TypeError, ValueError):
        raise BadRequest(description=f"{field_name} must be an integer")


def get_pagination(
    args,
    default_limit=DEFAULT_LIMIT,
    default_offset=DEFAULT_OFFSET,
    max_limit=MAX_LIMIT,
):
    limit = _safe_int(args.pop("limit", default_limit), "limit")
    offset = _safe_int(args.pop("offset", default_offset), "offset")
    if limit < 1:
        raise BadRequest(description="limit must be >= 1")
    if offset < 0:
        raise BadRequest(description="offset must be >= 0")
    return min(limit, max_limit), offset


def get_sort(args):
    return args.pop("sort_column", None), args.pop("sort_order", "desc")


def dump_json(response_dict):
    """BSON-aware JSON text (ObjectId, datetime, etc.) for API bodies."""
    json_options = JSONOptions()
    json_options.datetime_representation = DatetimeRepresentation.ISO8601
    return dumps(response_dict, indent=4, sort_keys=True, json_options=json_options)


def get_nested_value(dictionary, keys):
    keys_list = keys.split(".")
    value = dictionary
    try:
        for key in keys_list:
            value = value[key]
        return value
    except (KeyError, TypeError):
        return " "


def _format_tsv_scalar(value):
    """Single cell value for TSV (no tabs/newlines in output)."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value.replace("\t", " ").replace("\n", " ").replace("\r", " ")
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, datetime.datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return json.dumps(value, separators=(",", ":"), default=str).replace("\t", " ")
    return str(value).replace("\t", " ").replace("\n", " ").replace("\r", " ")


def _format_publications_tsv(raw):
    if not raw:
        return ""
    parts = []
    for p in raw:
        if not isinstance(p, dict):
            continue
        src = p.get("source")
        pid = p.get("id", "")
        if src is None and not pid:
            continue
        parts.append(f"{src}:{pid}" if src is not None else str(pid))
    return "; ".join(parts)


def _format_images_tsv(raw):
    if not raw:
        return ""
    parts = []
    for img in raw:
        if not isinstance(img, dict):
            continue
        url = (img.get("url") or "").strip()
        if not url:
            continue
        lic = (img.get("license") or "").strip()
        parts.append(f"{url} [{lic}]" if lic else url)
    return " | ".join(parts)


def _format_common_names_tsv(raw):
    if not raw:
        return ""
    parts = []
    for c in raw:
        if not isinstance(c, dict):
            continue
        val = (c.get("value") or "").strip()
        if not val:
            continue
        lang = c.get("lang")
        loc = c.get("locality")
        bits = [val]
        if lang:
            bits.append(str(lang))
        if loc:
            bits.append(str(loc))
        parts.append(" / ".join(bits) if len(bits) > 1 else val)
    return "; ".join(parts)


def _resolve_tsv_cell(item, field_key):
    """Resolve one TSV column from a catalog row dict (PyMongo-style)."""
    if "." in field_key:
        value = get_nested_value(item, field_key)
        if value == " ":
            value = None
        return _format_tsv_scalar(value)

    value = item.get(field_key)
    if field_key == "publications":
        return _format_publications_tsv(value)
    if field_key == "images":
        return _format_images_tsv(value)
    if field_key == "common_names":
        return _format_common_names_tsv(value)
    if field_key == "assigned_users":
        if not value:
            return ""
        if isinstance(value, list):
            return ",".join(_format_tsv_scalar(x) for x in value if x is not None and str(x).strip())
        return _format_tsv_scalar(value)

    if isinstance(value, list):
        if value and isinstance(value[0], dict):
            return _format_tsv_scalar(value)
        return ",".join(_format_tsv_scalar(x) for x in value)

    return _format_tsv_scalar(value)


def _tsv_row_from_item(item, fields):
    """Build a single TSV row (list of values) from an item and field names."""
    return [_resolve_tsv_cell(item, k) for k in fields]


def create_tsv(items, fields):
    writer_file = StringIO()
    tsv = csv.writer(writer_file, delimiter="\t")
    tsv.writerow(fields)
    for item in items:
        tsv.writerow(_tsv_row_from_item(item, fields))
    return writer_file.getvalue()


def stream_tsv(items_iterable, fields, buffer_size=2000):
    """Yield TSV content in chunks: header first, then buffer_size rows per chunk."""
    buf = StringIO()
    tsv = csv.writer(buf, delimiter="\t")
    tsv.writerow(fields)
    yield buf.getvalue().encode("utf-8")
    buf.close()

    batch = []
    for item in items_iterable:
        batch.append(_tsv_row_from_item(item, fields))
        if len(batch) >= buffer_size:
            buf = StringIO()
            tsv = csv.writer(buf, delimiter="\t")
            tsv.writerows(batch)
            yield buf.getvalue().encode("utf-8")
            buf.close()
            batch = []
    if batch:
        buf = StringIO()
        tsv = csv.writer(buf, delimiter="\t")
        tsv.writerows(batch)
        yield buf.getvalue().encode("utf-8")


def generate_json(items, limit=20, offset=0):
    total = items.count()
    response = dict(total=total, data=list(items.skip(offset).limit(limit).as_pymongo()))
    return dump_json(response), "application/json"


def generate_jsonlines(pymongo_data):
    for item in pymongo_data:
        yield dump_json(item) + "\n"


def generate_response(format, fields, items, limit=20, offset=0):
    if format == "tsv":
        return stream_tsv(items.as_pymongo(), fields, buffer_size=2000), "text/tab-separated-values"
    if format == "jsonl":
        return generate_jsonlines(items.as_pymongo()), "application/jsonlines"
    return generate_json(items, limit, offset)


def parse_selected_fields(selected_fields, allowed_fields=None):
    fields = [field.strip() for field in selected_fields.split(",") if field.strip()]
    if not fields:
        return None
    if not allowed_fields:
        return fields
    invalid = [field for field in fields if field not in allowed_fields]
    if invalid:
        raise BadRequest(description=f"Unsupported fields requested: {', '.join(invalid)}")
    return fields


def document_to_json_payload(doc):
    """
    Serialize a MongoEngine document to a JSON string using BSON-aware encoding
    (ObjectId, datetime, Binary, etc.) via bson.json_util — avoids BaseDocument.to_json()
    edge cases with raw PyMongo values.
    """
    if not isinstance(doc, Document):
        raise TypeError(f"Expected mongoengine.Document, got {type(doc)!r}")
    return dump_json(doc.to_mongo().to_dict())


def document_json_response(doc, status=200):
    """Flask Response for a single MongoEngine document (application/json)."""
    return build_response(
        document_to_json_payload(doc),
        mimetype="application/json",
        status=status,
    )


def documents_json_response(documents, status=200):
    """
    Flask Response for a JSON array of MongoEngine documents (QuerySet or iterable of docs).
    """
    raw = [doc.to_mongo().to_dict() for doc in documents]
    return build_response(
        dump_json(raw),
        mimetype="application/json",
        status=status,
    )


def _celery_app_for_async_result():
    """Bind AsyncResult to the Flask Celery app when in app context."""
    try:
        from flask import current_app, has_app_context

        if has_app_context():
            app = current_app.extensions.get("celery")
            if app is not None:
                return app
    except RuntimeError:
        pass
    try:
        from celery import current_app as celery_current

        return celery_current
    except Exception:
        return None


def _json_safe_result(value):
    """Return a value that json.dumps can handle (for API responses)."""
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, BaseException):
        return {"type": value.__class__.__name__, "message": str(value)}
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            try:
                json.dumps(v)
                out[str(k)] = v
            except (TypeError, ValueError):
                out[str(k)] = str(v)
        return out
    if isinstance(value, (list, tuple)):
        return [_json_safe_result(x) for x in value]
    return str(value)


def get_task_status(task_id):
    """
    Celery task state for GET /api/tasks/<task_id> (polling).

    Note: unknown or expired ids often appear as PENDING with ready() False until the
    backend evicts them — clients should treat long-lived PENDING as unknown/failed.
    """
    if task_id is None or not str(task_id).strip():
        raise BadRequest(description="task_id is required")

    tid = str(task_id).strip()
    app = _celery_app_for_async_result()
    task = AsyncResult(tid, app=app) if app is not None else AsyncResult(tid)

    try:
        state = task.state
        ready = task.ready()
        successful = task.successful() if ready else None
    except (ValueError, KeyError) as exc:
        # Redis/backend meta sometimes lacks exc_type when tasks used manual
        # update_state(FAILURE) + return, or raise Ignore() — Celery then cannot decode.
        logger.warning("Unreadable Celery task meta for %s: %s", tid, exc)
        payload = {
            "task_id": tid,
            "state": "UNKNOWN",
            "ready": True,
            "successful": False,
            "failed": True,
            "error": {
                "type": "TaskBackendDecodeError",
                "message": "Stored task result could not be decoded; poll may be stale.",
            },
            "result": None,
            "traceback": None,
        }
        payload["error_messages"] = _error_list_from_payload_error(payload["error"])
        payload["messages"] = _extract_messages(payload)
        return payload

    payload = {
        "task_id": tid,
        "state": state,
        "ready": ready,
        "successful": successful,
    }

    if ready:
        try:
            if successful:
                payload["result"] = _json_safe_result(task.result)
            elif task.failed():
                payload["failed"] = True
                payload["successful"] = False
                payload["error"] = _json_safe_result(task.result)
                payload["error_messages"] = _error_list_from_payload_error(payload["error"])
                payload["traceback"] = task.traceback
            else:
                payload["result"] = _json_safe_result(task.result)
        except (ValueError, KeyError) as exc:
            logger.warning("Unreadable Celery task result for %s: %s", tid, exc)
            payload["failed"] = True
            payload["successful"] = False
            payload["error"] = {
                "type": "TaskBackendDecodeError",
                "message": "Stored task result could not be decoded.",
            }
            payload["error_messages"] = _error_list_from_payload_error(payload["error"])
            payload["traceback"] = getattr(task, "traceback", None)
    else:
        payload["result"] = None
        info = getattr(task, "info", None)
        if info is not None:
            payload["info"] = _json_safe_result(info)
        if state == "PENDING" and info is None:
            payload["hint"] = (
                "Still waiting for a worker or unknown task id; keep polling with backoff."
            )

    # Convenience: flatten progress/result messages into a top-level list so
    # clients do not need to inspect info vs result vs error separately.
    payload["messages"] = _extract_messages(payload)

    return payload


def _extract_messages(payload: dict) -> list:
    """Return a flat list of human-readable message strings from a task payload."""
    def _from_value(v):
        if v is None:
            return []
        if isinstance(v, list):
            return [str(x) for x in v]
        if isinstance(v, dict):
            msgs = v.get("messages")
            if isinstance(msgs, list):
                return [str(m) for m in msgs]
            return [str(x) for x in v.values()]
        return [str(v)]

    if payload.get("ready"):
        if payload.get("successful"):
            return _from_value(payload.get("result"))
        return _from_value(payload.get("error"))

    info = payload.get("info")
    if info is not None:
        return _from_value(info)
    hint = payload.get("hint")
    if hint:
        return [hint]
    return []


def _error_list_from_payload_error(error_value) -> list:
    """Extract per-row error strings from task error payloads when possible."""
    if isinstance(error_value, dict):
        errs = error_value.get("errors")
        if isinstance(errs, list):
            return [str(e) for e in errs if str(e).strip()]
        msg = error_value.get("message")
        if isinstance(msg, str):
            return [line.strip() for line in msg.splitlines() if line.strip()]
    if isinstance(error_value, str):
        return [line.strip() for line in error_value.splitlines() if line.strip()]
    return []
