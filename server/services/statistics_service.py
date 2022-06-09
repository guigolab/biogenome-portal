from db.models import Organism,Assembly,Annotation,Experiment,LocalSample,BioSample
import json

def get_data_count():
    data_count = dict()
    ass = Assembly.objects().count()
    if ass > 0:
        data_count['assemblies'] = ass
    ann = Annotation.objects().count()
    if ann > 0:
        data_count['annotations'] = ann
    exp = Experiment.objects().count()
    if exp > 0:
        data_count['experiments'] = exp
    loc_samp= LocalSample.objects().count()
    if loc_samp > 0:
        data_count['local_samples'] = loc_samp
    biosam = BioSample.objects().count()
    if biosam > 0:
        data_count['biosamples'] = biosam
    return json.dumps(data_count)

