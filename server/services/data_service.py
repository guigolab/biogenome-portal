from db.models import Assembly, Experiment, SecondaryOrganism,Annotation

DB_MODEL_MAPPER={
 'assemblies': Assembly,
 'experiments':Experiment,
 'local_samples':SecondaryOrganism,
 'insdc_samples':SecondaryOrganism,
 'annotations':Annotation
}

def get_data(model, ids):
    return DB_MODEL_MAPPER[model].objects(id__in=ids).exclude('id').to_json()

def get_last_created(model):
    return DB_MODEL_MAPPER[model].objects.order_by('-id').first().to_json()



