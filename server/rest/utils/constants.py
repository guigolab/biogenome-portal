from db.models import Assembly,Annotation,BioSample,LocalSample,Experiment,Organism, TaxonNode, BioProject


MODEL_LIST = {
    'assemblies':Assembly,
    'taxons': TaxonNode,
    'annotations':Annotation,
    'biosamples':BioSample,
    'local_samples':LocalSample,
    'reads':Experiment,
    'organisms':Organism,
    'bioprojects':BioProject
    }