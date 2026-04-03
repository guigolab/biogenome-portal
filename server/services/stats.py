import logging

from extensions.cache import cache
from helpers import data as data_helper
from helpers.data import MODEL_MAPPER
from helpers.resource_mixins import dump_json

logger = logging.getLogger(__name__)

STATS_MODEL_KEYS = frozenset(
    {
        "assemblies",
        "annotations",
        "biosamples",
        "local_samples",
        "reads",
        "organisms",
        "taxons",
    }
)

MODEL_LIST = {k: MODEL_MAPPER[k]["model"] for k in STATS_MODEL_KEYS}

NO_VALUE_KEY = "No Entry"


@cache.memoize(timeout=300)
def get_stats(model, field, query):
    # Fail fast before parsing query args (404 path is cheaper).
    if model not in MODEL_LIST:
        return {"message": "model not found"}, 404

    db_model = MODEL_LIST[model]
    parsed_query, q_query = data_helper.create_query(query, None)
    items = db_model.objects(**parsed_query)
    if q_query:
        items = items.filter(q_query)

    # Normalize scalar vs array so $unwind is reliable for embedded dot paths (e.g. iucn_redlist.category).
    pipeline = [
        {
            "$set": {
                "_fv": {"$ifNull": [f"${field}", NO_VALUE_KEY]},
            }
        },
        {
            "$set": {
                "_fv_list": {
                    "$cond": {
                        "if": {"$isArray": "$_fv"},
                        "then": "$_fv",
                        "else": ["$_fv"],
                    }
                }
            }
        },
        {"$unwind": "$_fv_list"},
        {
            "$group": {
                "_id": "$_fv_list",
                "count": {"$sum": 1},
            }
        },
    ]

    try:
        # Aggregation ignores the in-memory result cache; skip cache bookkeeping.
        cursor = items.no_cache().aggregate(pipeline)
        response = {
            str(doc["_id"]): int(doc["count"]) for doc in cursor
        }
        # dump_json uses sort_keys=True — same key order as the old
        # sorted(response.items()) + dump_json, without an extra Python sort.
        return dump_json(response), 200

    except Exception as e:
        logger.exception("get_stats failed for model=%r field=%r", model, field)
        return {"message": str(e)}, 500
