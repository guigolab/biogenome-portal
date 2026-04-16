"""Persist and query :class:`~db.model.OrganismAuditLog` entries for CMS organism changes."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from flask_jwt_extended import get_jwt
from mongoengine import Q

from db.model import Organism, OrganismAuditLog
from helpers.resource_mixins import get_pagination, get_sort

logger = logging.getLogger(__name__)


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
    ``user`` (icontains), ``action`` (exact), ``q`` (matches user, taxid, scientific_name,
    or action substrings), ``date_from``, ``date_to`` (ISO-8601 datetimes for
    ``timestamp`` range), ``limit``, ``offset``, ``sort_column``, ``sort_order``.
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
        try:
            dt = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
            qs = qs.filter(timestamp__gte=dt)
        except ValueError:
            pass

    date_to = q.pop("date_to", None)
    if isinstance(date_to, str) and date_to.strip():
        try:
            dt = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
            qs = qs.filter(timestamp__lte=dt)
        except ValueError:
            pass

    # Free-text: match any of user, taxid, scientific_name
    search = q.pop("q", None)
    if isinstance(search, str) and search.strip():
        term = search.strip()
        qs = qs.filter(
            Q(user__icontains=term)
            | Q(taxid__icontains=term)
            | Q(scientific_name__icontains=term)
            | Q(action__icontains=term)
        )

    total = qs.count()
    items = list(qs.order_by(order).skip(offset).limit(limit))
    data = [log.to_mongo().to_dict() for log in items]
    return {"total": total, "limit": limit, "offset": offset, "data": data}
