from db.models import Organism,SecondaryOrganism,Experiment,Assembly
from utils import utils,ena_client

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


