import logging

from db.models import (
    Assembly,
    BioSample,
    GenomeAnnotation,
    LocalSample,
    Organism,
    ReadRun,
    TaxonNode,
)
from extensions.cache import cache
from helpers import data as data_helper

logger = logging.getLogger(__name__)

MODEL_LIST = {
    "assemblies": Assembly,
    "annotations": GenomeAnnotation,
    "biosamples": BioSample,
    "local_samples": LocalSample,
    "reads": ReadRun,
    "organisms": Organism,
    "taxons": TaxonNode,
}

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

    pipeline = [
        {
            "$project": {
                "field_value": {
                    "$ifNull": [f"${field}", f"{NO_VALUE_KEY}"],
                }
            }
        },
        {"$unwind": "$field_value"},
        {
            "$group": {
                "_id": "$field_value",
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
        # data_helper.dump_json uses sort_keys=True — same key order as the old
        # sorted(response.items()) + dump_json, without an extra Python sort.
        return data_helper.dump_json(response), 200

    except Exception as e:
        logger.exception("get_stats failed for model=%r field=%r", model, field)
        return {"message": str(e)}, 500
