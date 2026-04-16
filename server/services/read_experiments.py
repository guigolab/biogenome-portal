"""Paginated experiment_accession groups for read-run catalog filters."""

import logging

from werkzeug.exceptions import BadRequest

from helpers.data import MODEL_MAPPER, create_query, _catalog_params_as_plain_dict
from helpers.resource_mixins import dump_json
from helpers import resource_mixins as rm

logger = logging.getLogger(__name__)


def get_read_experiment_groups(request_args):
    """
    GET query params match catalog list (``filter``, ``taxon_lineage``, ranges, etc.).

    Returns JSON:
    ``{"items": [{"experiment_accession", "experiment_title", "count"}], "total": N, "offset", "limit"}``.
    """
    mapper = MODEL_MAPPER.get("reads")
    if not mapper:
        return dump_json({"message": "reads model not configured"}), 500

    try:
        params = _catalog_params_as_plain_dict(request_args)
        args = dict(params)
        text_filter = args.pop("filter", None)
        q_query = mapper["query"](text_filter) if text_filter else None

        limit, offset = rm.get_pagination(args)

        for k in ("format", "fields", "sort_column", "sort_order"):
            args.pop(k, None)

        query, q_query = create_query(args, q_query)
        items = mapper["model"].objects(**query)
        if q_query:
            items = items.filter(q_query)

        pipeline = [
            {
                "$match": {
                    "experiment_accession": {"$exists": True, "$nin": [None, ""]},
                }
            },
            {
                "$group": {
                    "_id": {
                        "experiment_accession": "$experiment_accession",
                        "experiment_title": {"$ifNull": ["$metadata.experiment_title", ""]},
                    },
                    "count": {"$sum": 1},
                }
            },
            {"$sort": {"count": -1}},
            {
                "$facet": {
                    "total_row": [{"$count": "total"}],
                    "page": [{"$skip": offset}, {"$limit": limit}],
                }
            },
        ]

        row = next(items.no_cache().aggregate(pipeline, allowDiskUse=True), None)
        total = 0
        raw_page = []
        if row:
            tr = row.get("total_row") or []
            if tr and isinstance(tr[0], dict):
                total = int(tr[0].get("total", 0))
            raw_page = row.get("page") or []

        out_items = []
        for doc in raw_page:
            _id = doc.get("_id") or {}
            out_items.append(
                {
                    "experiment_accession": _id.get("experiment_accession"),
                    "experiment_title": _id.get("experiment_title") or "",
                    "count": int(doc.get("count", 0)),
                }
            )

        payload = {
            "items": out_items,
            "total": total,
            "offset": offset,
            "limit": limit,
        }
        return dump_json(payload), 200
    except BadRequest:
        raise
    except Exception as e:
        logger.exception("get_read_experiment_groups failed")
        return dump_json({"message": str(e)}), 500
