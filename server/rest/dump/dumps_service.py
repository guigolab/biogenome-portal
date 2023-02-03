from db.models import Annotation, Assembly, BioProject, BioSample, Experiment, LocalSample, Organism, TaxonNode
import json

MODEL = {
    'organism': Organism,
    'biosample': BioSample,
    'assembly': Assembly,
    'annotation': Annotation,
    'experiment': Experiment,
    'local_sample': LocalSample,
    'bioproject': BioProject,
    'taxon': TaxonNode
}

def get_data(model):
    if not model in MODEL.keys():
        return json.dumps(f"{model} not found"), 404
    return MODEL[model].objects().to_json(), 200
    
