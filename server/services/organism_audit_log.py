"""Persist and query :class:`~db.model.OrganismAuditLog` entries for CMS organism changes."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from flask_jwt_extended import get_jwt
from mongoengine import Q

from db.model import Organism, OrganismAuditLog
from helpers.resource_mixins import get_pagination, get_sort

logger = logging.getLogger(__name__)


def _parse_audit_bound_datetime(value: str, *, end_of_day: bool = False) -> datetime | None:
    """Parse ISO-8601 datetime or date-only (YYYY-MM-DD) for audit timestamp filters."""
    raw = value.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(raw)
    except ValueError:
        return None
    if len(raw) == 10 and end_of_day:
        return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
    return dt


def _actor_username() -> str:
    try:
        claims = get_jwt() or {}
        for key in ("username", "sub", "identity"):
            val = claims.get(key)
            if val is not None and str(val).strip():
                return str(val).strip()
    except Exception:
        pass
    return "unknown"


def organism_snapshot(organism: Organism) -> dict[str, Any] | None:
    if organism is None:
        return None
    try:
        return organism.to_mongo().to_dict()
    except Exception:
        logger.exception("organism_snapshot failed taxid=%s", getattr(organism, "taxid", None))
        return None


def record_organism_audit(
    *,
    action: str,
    taxid: str,
    scientific_name: str,
    previous_object: dict[str, Any] | None = None,
    new_object: dict[str, Any] | None = None,
) -> None:
    """Best-effort audit row; failures are logged and do not propagate."""
    try:
        OrganismAuditLog(
            action=action,
            user=_actor_username(),
            timestamp=datetime.now(timezone.utc),
            taxid=str(taxid),
            scientific_name=str(scientific_name or ""),
            previous_object=previous_object,
            new_object=new_object,
        ).save()
    except Exception:
        logger.exception(
            "organism audit log save failed action=%s taxid=%s", action, taxid
        )


def search_organism_audit_logs(query: dict[str, Any]) -> dict[str, Any]:
    """
    Admin-only search over ``OrganismAuditLog``.

    Recognised query keys (all optional): ``taxid``, ``scientific_name`` (icontains),
    ``user`` (icontains), ``action`` (exact), ``q`` (matches user or scientific_name
    substrings), ``date_from``, ``date_to`` (ISO-8601 datetimes or YYYY-MM-DD for
    ``timestamp`` range; date-only ``date_to`` is inclusive through end of day),
    ``limit``, ``offset``, ``sort_column``, ``sort_order``.
    """
    q = dict(query)
    limit, offset = get_pagination(q)
    sort_column, sort_order = get_sort(q)

    allowed_sort = {"timestamp", "taxid", "action", "user", "scientific_name"}
    col = sort_column if sort_column in allowed_sort else "timestamp"
    direction = "-" if (sort_order or "desc").lower() == "desc" else ""
    order = f"{direction}{col}"

    qs = OrganismAuditLog.objects()

    raw_taxid = q.pop("taxid", None)
    if raw_taxid is not None and str(raw_taxid).strip():
        qs = qs.filter(taxid=str(raw_taxid).strip())

    raw_action = q.pop("action", None)
    if raw_action is not None and str(raw_action).strip():
        qs = qs.filter(action=str(raw_action).strip())

    sn = q.pop("scientific_name", None)
    if isinstance(sn, str) and sn.strip():
        qs = qs.filter(scientific_name__icontains=sn.strip())

    user = q.pop("user", None)
    if isinstance(user, str) and user.strip():
        qs = qs.filter(user__icontains=user.strip())

    date_from = q.pop("date_from", None)
    if isinstance(date_from, str) and date_from.strip():
        dt = _parse_audit_bound_datetime(date_from, end_of_day=False)
        if dt is not None:
            qs = qs.filter(timestamp__gte=dt)

    date_to = q.pop("date_to", None)
    if isinstance(date_to, str) and date_to.strip():
        dt = _parse_audit_bound_datetime(date_to, end_of_day=True)
        if dt is not None:
            qs = qs.filter(timestamp__lte=dt)

    # Free-text: match user or scientific_name
    search = q.pop("q", None)
    if isinstance(search, str) and search.strip():
        term = search.strip()
        qs = qs.filter(Q(user__icontains=term) | Q(scientific_name__icontains=term))

    total = qs.count()
    items = list(qs.order_by(order).skip(offset).limit(limit))
    data = [log.to_mongo().to_dict() for log in items]
    return {"total": total, "limit": limit, "offset": offset, "data": data}


def search_organism_audit_logs_for_taxid(
    taxid: str,
    query: dict[str, Any],
) -> dict[str, Any]:
    """Taxid-scoped search over ``OrganismAuditLog`` (caller controls authz)."""
    scoped_query = dict(query)
    scoped_query["taxid"] = str(taxid).strip()
    return search_organism_audit_logs(scoped_query)
