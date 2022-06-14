from db.models import Organism,Assembly,Annotation,Experiment,LocalSample,BioSample
import json

##count how many organisms have data
def get_data_count():
    data_count = dict()
    ass = Assembly.objects().count()
    if ass > 0:
        organisms = Organism.objects(assemblies__not__size=0).count()
        data_count['assemblies'] = dict(total=ass,organisms=organisms)
    ann = Annotation.objects().count()
    if ann > 0:
        organisms = Organism.objects(annotations__not__size=0).count()
        data_count['annotations'] = dict(total=ann,organisms=organisms)
    exp = Experiment.objects().count()
    if exp > 0:
        organisms = Organism.objects(experiments__not__size=0).count()
        data_count['experiments'] = dict(total=exp,organisms=organisms)
    loc_samp= LocalSample.objects().count()
    if loc_samp > 0:
        organisms = Organism.objects(local_samples__not__size=0).count()
        data_count['local_samples'] = dict(total=loc_samp, organisms=organisms)
    biosam = BioSample.objects().count()
    if biosam > 0:
        organisms = Organism.objects(biosamples__not__size=0).count()
        data_count['biosamples'] = dict(total=biosam,organisms=organisms)
    return json.dumps(data_count)

