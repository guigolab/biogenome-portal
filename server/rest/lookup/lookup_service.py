from db.models import Assembly, GenomeAnnotation, BioSample, LocalSample, Organism, Experiment,Chromosome,TaxonNode
from werkzeug.exceptions import NotFound
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
        raise NotFound(description=f"Organism {taxid} not found")
    response = {}
    for key in MODEL_LIST:
        if key == 'organisms':
            continue
        response[key] = MODEL_LIST[key].objects(taxid=taxid).count()
    return response

def lookup_taxon_data(taxid):
    if not TaxonNode.objects(taxid=taxid).first():
        raise NotFound(description=f"Taxon {taxid} not found")
    response = {}
    for k,v in MODEL_LIST.items():
        response[k] = v.objects(taxon_lineage=taxid).count()
    return response

def lookup_assembly_data(accession):
    assembly = Assembly.objects(accession=accession).first()
    if not assembly:
        raise NotFound(description=f"Assembly {accession} not found")
    annotations = GenomeAnnotation.objects(assembly_accession=accession).count()
    chromosomes = Chromosome.objects(accession_version__in=assembly.chromosomes).count()
    return dict(annotations=annotations,chromosomes=chromosomes)


def lookup_biosample_data(accession):
    biosample = BioSample.objects(accession=accession).first()
    related_exp_query = Q(sample_accession=accession) | Q(metadata__sample_accession=accession)
    if not biosample:
        raise NotFound(description=f"BioSample {accession} not found")
    sub_samples =  BioSample.objects(__raw__ = {'metadata.sample derived from' : accession}).count()
    assemblies = Assembly.objects(sample_accession=accession).count()
    experiments = Experiment.objects(related_exp_query).count()
    return dict(sub_samples=sub_samples,assemblies=assemblies,experiments=experiments)

