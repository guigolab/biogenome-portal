from db.models import Organism,SecondaryOrganism,Experiment,Assembly, TrackStatus
from services import taxon_service
from mongoengine.queryset.visitor import Q
from flask import current_app as app


def create_sample_object(metadata):
    #convert dicts in geolocation objects
    sample = SecondaryOrganism(**metadata)
    return sample

## delete samples species specific, doesn't support multi species deletion
##should check is sample derived from, experiment and assemblies
def delete_samples(ids):
    samples_to_delete = SecondaryOrganism.objects((Q(accession__in=ids) | Q(tube_or_well_id__in=ids)))
    assemblies_to_delete=list()
    experiments_to_delete=list()
    for sample in samples_to_delete:
        if sample.sample_derived_from:
            SecondaryOrganism.objects(accession = sample.sample_derived_from).update_one(pull__specimens=sample.id)
        if len(sample.assemblies) > 0:
            assemblies_to_delete.extend([ass.id for ass in sample.assemblies])
        if len(sample.experiments) > 0:
            experiments_to_delete.extend([exp.id for exp in sample.experiments])
    taxid = samples_to_delete[0].taxid
    if any([taxid != sample.taxid for sample in samples_to_delete]):
        return {'error':'Can only delete samples related to one organism'}
    #first delete organism and taxons
    organism = Organism.objects(taxid=taxid)
    if len(assemblies_to_delete) > 0 and len(experiments_to_delete) > 0:
        organism.update_one(pull_all__records=[sample.id for sample in samples_to_delete], pull_all__assemblies=assemblies_to_delete, pull_all__experiments=experiments_to_delete)
        Experiment.objects(id__in=experiments_to_delete).delete()
        Assembly.objects(id__in=assemblies_to_delete).delete()
    elif len(assemblies_to_delete)>0:
        organism.update_one(pull_all__records=[sample.id for sample in samples_to_delete], pull_all__assemblies=assemblies_to_delete)
        Assembly.objects(id__in=assemblies_to_delete).delete()
    elif len(experiments_to_delete) > 0:
        organism.update_one(pull_all__records=[sample.id for sample in samples_to_delete], pull_all__experiments=experiments_to_delete)
        Experiment.objects(id__in=experiments_to_delete).delete()
    else:
        organism.update_one(pull_all__records=[sample.id for sample in samples_to_delete])
    
    organism = organism.first() #fetch organism
    if len(organism.assemblies) == 0 and len(organism.experiments) == 0:
        organism.update(trackingSystem=TrackStatus.SAMPLE)
    elif len(organism.experiments) == 0:
        organism.update(trackingSystem=TrackStatus.ASSEMBLIES)
    elif len(organism.assemblies) == 0:
        organism.update(trackingSystem=TrackStatus.RAW_DATA)

    if len(organism.records) == 0:
        #delete organism and update taxons leafes
        taxon_service.delete_taxons(organism.taxon_lineage)
        organism.delete()
    samples_to_delete.delete()
    return {'success':'samples: '+ ','.join(ids) + ' deleted'}
