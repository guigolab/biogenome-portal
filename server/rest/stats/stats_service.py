from db.models import Assembly,GenomeAnnotation,BioSample,LocalSample,Experiment,Organism,TaxonNode
from extensions.cache import cache


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
def get_stats(model, field):
    # Check if the model exists in MODEL_LIST
    if model not in MODEL_LIST:
        return {"message": "model not found"}, 404

    db_model = MODEL_LIST[model]

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
            for doc in db_model.objects.aggregate(pipeline)
        }
        # Sort the response dictionary
        sorted_response = {key : response[key] for key in sorted(response)}

        return sorted_response, 200

    except Exception as e:
        # Log the exception e if logging is set up
        return {"message": str(e)}, 500