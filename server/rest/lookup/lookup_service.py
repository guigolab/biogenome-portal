from db.models import Assembly, GenomeAnnotation, BioSample, LocalSample, Organism, Experiment,Chromosome
from errors import NotFound
from utils.extensions.cache import cache


MODEL_LIST = {
    'assemblies':Assembly,
    'annotations':GenomeAnnotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'experiments':Experiment,
    'organisms':Organism,
    }


def lookup_models_by_taxon(parent_taxon):
    return [
            {"$match": {"taxon_lineage": parent_taxon}},

    {"$lookup": {
        "from": "bio_sample",
        "localField": "taxid",
        "foreignField": "taxid",
        "as": "total_biosamples"
    }},
    {"$lookup": {
        "from": "assembly",
        "localField": "taxid",
        "foreignField": "taxid",
        "as": "total_assemblies"
    }},

    {"$lookup": {
        "from": "experiment",
        "localField": "taxid",
        "foreignField": "taxid",
        "as": "total_experiments"
    }},

    {"$lookup": {
        "from": "local_sample",
        "localField": "taxid",
        "foreignField": "taxid",
        "as": "total_local_samples"
    }},
    {"$lookup": {
        "from": "genome_annotation",
        "localField": "taxid",
        "foreignField": "taxid",
        "as": "total_annotations"
    }},
    {"$group": {
        "_id": None,
        "assemblies": {"$sum": {"$size": "$total_assemblies"}},
        "biosamples": {"$sum": {"$size": "$total_biosamples"}},
        "experiments": {"$sum": {"$size": "$total_experiments"}},
        "local_samples": {"$sum": {"$size": "$total_local_samples"}},
        "annotations": {"$sum": {"$size": "$total_annotations"}},
    }},
    # Project to rename the field and exclude the _id field
    {"$project": {
        "_id": 0,
        "assemblies": 1,
        "biosamples":1,
        "experiments":1,
        "annotations":1,
        "local_samples":1,
    }}
]


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

@cache.memoize(timeout=300)
def lookup_taxon_data(taxid):
    result = Organism.objects.aggregate(lookup_models_by_taxon(taxid))
    try:
        response = next(result)
        response["organisms"] = Organism.objects(taxon_lineage=taxid).count()
        return response
    except StopIteration:
        return {}

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

