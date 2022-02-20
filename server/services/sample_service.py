from db.models import Organism,SecondaryOrganism,Experiment,Assembly, TaxonNode
from services import organisms_service,taxon_service
from utils import utils,ena_client,constants
from mongoengine.queryset.visitor import Q
from flask import current_app as app
import json


def update_sample(sample):
    organism = Organism.objects(taxid = str(sample.taxonId)).first()
    experiments = get_reads(sample.accession)
    assemblies = parse_assemblies(sample.accession)
    if len(sample.assemblies) != len(assemblies):
        new_assemblies = list(set([ass.accession for ass in assemblies]) - set([ass.fetch().accession for ass in sample.assemblies]))
        for ass in new_assemblies:
            if not any([ass['accession'] == assembly.accession for assembly in organism.assemblies]):
                ass_obj = Assembly(**ass).save()
            else:
                continue
            sample.assemblies.append(ass_obj)
            organism.assemblies.append(ass_obj)
    if len(sample.experiments) != len(experiments):
        new_experiments = list(set(experiments) - set(sample.experiments))
        for ex in new_experiments:
            if not any([ex['experiment_accession'] == experiment.experiment_accession for experiment in organism.experiments]):
                exp_obj = Experiment(**ex).save()
            else:
                continue
            sample.experiments.append(exp_obj)
            organism.experiments.append(exp_obj)
    sample.save()
    update_status(organism)

def create_sample_object(metadata):
    #convert dicts in geolocation objects
    sample = SecondaryOrganism(**metadata)
    return sample

# def update_sample(accession):
#     sample = SecondaryOrganism((Q(accession=id)| Q(sample_unique_name=id))).first()
#     if not sample:
#         raise 

## delete samples species specific, doesn't support multi species deletion
def delete_samples(ids):
    samples_to_delete = SecondaryOrganism.objects((Q(accession__in=ids)|Q(sample_unique_name__in=ids)))
    taxid = next(samples_to_delete).taxid
    if any([taxid != sample.taxid for sample in samples_to_delete]):
        return {'error':'Can only delete samples related to one organism'}
    #first delete organism and taxons
    organism = Organism.objects(taxid=taxid)
    
    organism.update_one(pull_all__records=[sample.id for sample in samples_to_delete])
    if len(organism.first().records) == 0:
        #delete organism and update taxons leafes
        taxons_to_update=list()
        for taxon in organism.first().taxon_lineage:
            fetched_taxon = taxon.fetch()
            if fetched_taxon.leaves <= 1:
                TaxonNode.objects(children=fetched_taxon.id).update_one(pull_children=fetched_taxon.id)
                fetched_taxon.delete()
            else:
                taxons_to_update.append(fetched_taxon)
        app.logger.info(taxons_to_update)
        taxon_service.leaves_counter(taxons_to_update)
        organism.delete()
    samples_to_delete.delete()
    return {'success':'samples '+ ','.join(ids) + 'succesfully deleted'}

            # organism = organisms_service.get_or_create_organism(sample.taxid, list())

    #should implement way to drop everything --> delete in root_organisms
    #retrieve samples
    #retrieve organism
    #if organism doesnt contain other samples delete it and trigger taxon update(leaves counter and delete taxon)

# def create_sample(sample, accession, taxon_id):
#     organism = Organism.objects(taxid=taxon_id).first() if Organism.objects(taxid=taxon_id).first() else get_organism(taxon_id)
#     if not organism:
#         return ##skip sample creation if taxon is not present in ENA
#     secondary_organism = SecondaryOrganism(accession = accession, taxonId = taxon_id)
#     for key in sample.keys():
#         if key in CHECKLIST_PARSER.keys():
#             secondary_organism[CHECKLIST_PARSER[key]] = {}
#             secondary_organism[CHECKLIST_PARSER[key]]['text'] = sample[key][0]['text']
#             if 'unit' in sample[key][0].keys():
#                 secondary_organism[CHECKLIST_PARSER[key]]['unit'] = sample[key][0]['unit']
#     experiments = get_reads(accession)
#     assemblies = parse_assemblies(accession)
#     if len(assemblies) > 0:
#         for assembly in assemblies:
#             assembly['sample_accession'] = accession
#             ass = Assembly(**assembly).save()
#             secondary_organism.assemblies.append(ass)
#             organism.assemblies.append(ass)
#     if len(experiments) > 0:
#         for experiment in experiments:
#             exp = Experiment(**experiment).save()
#             secondary_organism.experiments.append(exp)
#             organism.experiments.append(exp)
#     secondary_organism.save()
#     if not secondary_organism.sample_derived_from:
#         organism.records.append(secondary_organism)
#     update_status(organism)


