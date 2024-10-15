from db.models import Assembly,GenomeAnnotation,BioSample,LocalSample,Experiment,Organism,TaxonNode
from extensions.cache import cache
from helpers import data as data_helper

MODEL_LIST = {
    'assemblies':Assembly,
    'annotations':GenomeAnnotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'experiments':Experiment,
    'organisms':Organism,
    'taxons':TaxonNode
    }


@cache.memoize(timeout=300)
def get_stats(model, field, query):
    # Check if the model exists in MODEL_LIST

    if model not in MODEL_LIST:
        return {"message": "model not found"}, 404

    db_model = MODEL_LIST[model]
    parsed_query, q_query = data_helper.create_query(query, None)
    items = db_model.objects(**parsed_query)
    if q_query:
        items = items.filter(q_query)
    try:
        pipeline = [
            {
                "$project": {
                    "field_value": {
                        "$ifNull": [f"${field}", "No Value"]
                    }
                }
            },
            {"$unwind": "$field_value"},
            {
                "$group": {
                    "_id": "$field_value",
                    "count": {"$sum": 1}
                }
            },
        ]

        response = {
            doc["_id"]: doc["count"]
            for doc in items.aggregate(pipeline)
        }
        # Sort the response dictionary
        sorted_response = {key : response[key] for key in sorted(response)}
        return data_helper.dump_json(sorted_response), 200

    except Exception as e:
        print(e)
        return {"message": str(e)}, 500