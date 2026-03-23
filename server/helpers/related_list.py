"""Shared helpers for paginated related-catalog list responses."""

from __future__ import annotations

from typing import Iterable, Sequence

from helpers import data as data_helper


def related_catalog_items(
    queryset,
    args,
    *,
    fields: Sequence[str],
    default_sort_column: str,
    extra_allowed: Iterable[str] = ("metadata", "taxon_lineage"),
):
    """Wrap ``data.get_related_items`` with the usual filter/sort field allowlist."""
    allowed_fields = list(fields) + list(extra_allowed)
    return data_helper.get_related_items(
        queryset,
        args,
        fields=list(fields),
        allowed_fields=allowed_fields,
        default_sort_column=default_sort_column,
    )
