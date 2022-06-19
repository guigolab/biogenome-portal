from db.models import Assembly, BioProject, Experiment, GeoCoordinates, LocalSample,BioSample,Annotation, TaxonNode

DB_MODEL_MAPPER={
 'assemblies': {'model':Assembly, 'query':'accession__in'},
 'experiments':{'model':Experiment, 'query':'experiment_accession__in'},
 'local_samples':{'model':LocalSample, 'query':'local_id__in'},
 'biosamples':{'model':BioSample, 'query':'accession__in'},
 'annotations':{'model':Annotation, 'query':'name__in'},
}

def get_data(model, ids):
    query = dict()
    query[DB_MODEL_MAPPER[model]['query']] = ids
    return DB_MODEL_MAPPER[model]['model'].objects(**query).exclude('id').to_json()

def get_last_created(model):
    return DB_MODEL_MAPPER[model].objects.order_by('-id').first().to_json()


