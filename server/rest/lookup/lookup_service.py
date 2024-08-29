from db.models import Assembly, GenomeAnnotation, BioSample, LocalSample, Organism, Experiment,Chromosome
from errors import NotFound
from mongoengine.queryset.visitor import Q

CHUNK_LIMIT = 10000

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
        counts = v.objects().count()
        response[k] = counts
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
    taxid_list = Organism.objects(taxon_lineage=taxid).scalar('taxid')
    response= {
        'organisms':len(taxid_list)
    }
    for k,v in MODEL_LIST.items():
        if k == 'organisms':
            continue
        response[k] = 0
        if len(taxid_list) > CHUNK_LIMIT:
            chunks = [taxid_list[i:i+CHUNK_LIMIT] for i in range(0, len(taxid_list), CHUNK_LIMIT)]
            for chunk in chunks:
                response[k] = response[k] + v.objects(taxid__in=chunk).count()
        else:
            response[k] = v.objects(taxid__in=taxid_list).count()
    return response

def lookup_assembly_data(accession):
    assembly = Assembly.objects(accession=accession).first()
    if not assembly:
        raise NotFound
    annotations = GenomeAnnotation.objects(assembly_accession=accession).count()
    chromosomes = Chromosome.objects(accession_version__in=assembly.chromosomes).count()
    return dict(annotations=annotations,chromosomes=chromosomes)



def lookup_biosample_data(accession):
    biosample = BioSample.objects(accession=accession).first()
    related_exp_query = Q(sample_accession=accession) | Q(metadata__sample_accession=accession)
    if not biosample:
        raise NotFound
    sub_samples =  BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).count()
    assemblies = Assembly.objects(sample_accession=accession).count()
    experiments = Experiment.objects(related_exp_query).count()
    return dict(sub_samples=sub_samples,assemblies=assemblies,experiments=experiments)

