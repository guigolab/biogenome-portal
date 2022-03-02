from db.models import Assembly, Experiment, Organism, SecondaryOrganism


def get_data(model, ids):
    data = list()
    if model == 'assemblies':
        data = Assembly.objects(id__in=ids).to_json()
    elif model == 'experiments':
        data = Experiment.objects(id__in=ids).to_json()
    return data