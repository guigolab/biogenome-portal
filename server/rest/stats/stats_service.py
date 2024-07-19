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
    if model not in MODEL_LIST.keys():
        return 404
    db_model = MODEL_LIST[model]
    try:
        resp = db_model.objects.item_frequencies(field)
        status = 200
    except:
        resp = {'message': 'field not found'}
        status = 400
    if None in resp:
        resp["No Value"] = resp[None]
        del resp[None]
    return resp, status
