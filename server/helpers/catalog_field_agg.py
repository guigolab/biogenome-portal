"""
Build MongoDB aggregation expressions for catalog dot-path field names.

Paths may include segments with spaces or hyphens (e.g. ``metadata.collection date``,
``metadata.ENA-CHECKLIST``) that are not valid as a single dotted string; those use ``$getField``.
"""

from __future__ import annotations

import re

_SIMPLE_SEG = re.compile(r"^[a-zA-Z_][a-zA-Z0-9_]*$")


def mongo_value_expr(field: str):
    """
    Expression that reads the document field at ``field`` (dot-separated path).

    When every segment matches ``_SIMPLE_SEG``, returns a single dotted path string
    (e.g. ``$metadata.assembly_info.release_date``).

    Otherwise builds ``$getField`` chains for non-simple segments
    (e.g. ``metadata.collection date`` → ``$getField`` from ``$metadata``).
    """
    parts = field.split(".")
    if not parts:
        return "$$ROOT"
    if len(parts) == 1:
        return f"${parts[0]}"
    if all(_SIMPLE_SEG.match(p) for p in parts):
        return "$" + ".".join(parts)
    current: str | dict = f"${parts[0]}"
    for p in parts[1:]:
        if _SIMPLE_SEG.match(p):
            if isinstance(current, str):
                current = current + "." + p
            else:
                current = {"$getField": {"field": p, "input": current}}
        else:
            inp = current
            current = {"$getField": {"field": p, "input": inp}}
    return current
