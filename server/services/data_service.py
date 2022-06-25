from db.models import Assembly, BioProject, Experiment, GeoCoordinates, LocalSample,BioSample,Annotation, TaxonNode

DB_MODEL_MAPPER={
 'assemblies': Assembly,
 'experiments':Experiment,
 'local_samples':LocalSample,
 'biosamples':BioSample,
 'annotations':Annotation,
}

def get_data(model, taxid=None):
    if taxid:
        return DB_MODEL_MAPPER[model].objects(taxid=taxid).exclude('id','created').to_json()
    else:
        return DB_MODEL_MAPPER[model].objects().exclude('id','created').to_json()


