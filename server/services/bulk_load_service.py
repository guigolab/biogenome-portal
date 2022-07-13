from db.models import Annotation, Assembly, BioProject, BioSample, Experiment, LocalSample, Organism
import json
from services import biosample
from utils import data_helper
from services import assembly

MODEL = {
    'organism': Organism,
    'biosample': BioSample,
    'assembly': Assembly,
    'annotation': Annotation,
    'experiment': Experiment,
    'local_sample': LocalSample,
    'bioproject': BioProject,
}


def get_data(model):
    if not model in MODEL.keys():
        return json.dumps(f"{model} not found"), 404
    return MODEL[model].objects().to_json(), 200
    

def load_data(model,data):
    print(data)
    if model == 'assembly':
        for ass in data:
            ass_obj = assembly.create_assembly_from_ncbi_data(ass, ass['biosample_accession'])
            data_helper.create_data_from_assembly(ass_obj,ass)
    elif model == 'biosamples':
        for project in data.keys():
            for sample in data[project]:
                biosample_obj = biosample.create_biosample_from_ebi_data(sample)
                data_helper.create_data_from_biosample(biosample_obj)