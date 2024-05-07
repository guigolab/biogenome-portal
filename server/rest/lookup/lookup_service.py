from db.models import Assembly, GenomeAnnotation, BioSample, LocalSample, Organism, Experiment,Chromosome
from errors import NotFound

MODEL_LIST = {
    'assemblies':Assembly,
    'annotations':GenomeAnnotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'experiments':Experiment,
    'organisms':Organism,
    }

def get_instance_stats():
    response = {}
    for k,v in MODEL_LIST.items():
        response[k] = v.objects().count()
    return response


def lookup_organism_data(taxid):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        raise NotFound
    response = {}
    for key in MODEL_LIST:
        if key == 'organisms':
            continue
        response[key] = MODEL_LIST[key].objects(taxid=taxid).count()
    return response

def lookup_taxon_data(taxid):
    organisms = Organism.objects(taxon_lineage=taxid)
    if not organisms.count():
        raise NotFound
    resp = dict(organisms=organisms.count())
    taxids = organisms.scalar('taxid')
    for model in MODEL_LIST:
        if model == 'organisms':
            continue
        resp[model] = MODEL_LIST[model].objects(taxid__in=taxids).count()
    return resp

def lookup_assembly_data(accession):
    assembly = Assembly.objects(accession=accession).first()
    if not assembly:
        raise NotFound
    annotations = GenomeAnnotation.objects(assembly_accession=accession).count()
    chromosomes = Chromosome.objects(accession_version__in=assembly.chromosomes).count()
    return dict(annotations=annotations,chromosomes=chromosomes)



def lookup_biosample_data(accession):
    biosample = BioSample.objects(accession=accession).first()
    if not biosample:
        raise NotFound
    sub_samples =  BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).count()
    assemblies = Assembly.objects(sample_accession=accession).count()
    experiments = Experiment.objects(sample_accession=accession).count()
    return dict(sub_samples=sub_samples,assemblies=assemblies,experiments=experiments)

