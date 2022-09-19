from db.models import Annotation, Assembly, BioProject, BioSample, Experiment, GeoCoordinates, LocalSample, Organism,TaxonNode
from services import organism_service


def get_statistics(parent_taxid=None,bioproject=None,
                biosamples=None,local_samples=None,
                assemblies=None,experiments=None,
                annotations=None):
    query=dict()
    if parent_taxid:
        query['taxon_lineage'] = parent_taxid
    if bioproject:
        query['bioprojects'] = bioproject
    organism_service.get_data_query(query, biosamples, local_samples, assemblies, annotations, experiments)
    organisms = Organism.objects.filter(**query).exclude('id')
    stats = organism_service.get_stats(organisms)
    return stats
