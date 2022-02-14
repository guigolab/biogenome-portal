from db.models import  Organism, SecondaryOrganism,TrackStatus,Assembly,Experiment
from utils import ena_client,utils
from services import sample_service,organisms_service
from flask import current_app as app

#import biosamples
def import_records(PROJECTS):
    samples = list()
    for project in PROJECTS:
        resp = ena_client.get_samples(project)
        if resp and '_embedded' in resp.keys():
            samples.extend(resp['_embedded']['samples'])
    if len(samples) == 0 or \
        (len(samples) > 0 and len(samples) == len(SecondaryOrganism.objects())):
        return
    samples_to_save=list()
    organisms_to_update=list()
    print([sample['accession'] for sample in samples])
    existing_samples = SecondaryOrganism.objects(accession__in=[sample['accession'] for sample in samples])
    print(len(existing_samples))
    for sample in samples[:10]:
        accession = sample['accession']
        taxid = str(sample['taxId'])
        #skip already existing samples
        if accession in [ex_sample.accession for ex_sample in existing_samples]:
            print('HERREEE')
            continue ##update here
        sample_obj = dict(accession = accession, taxid=taxid)
        utils.parse_sample_metadata(sample_obj, sample['characteristics'])
        sample_to_save = sample_service.create_sample_object(sample_obj)
        organism = next((org for org in organisms_to_update if org.taxid == taxid), organisms_service.get_or_create_organism(taxid))
        experiments = ena_client.get_reads(accession)
        assemblies = ena_client.parse_assemblies(accession)
        if len(assemblies) > 0:
            for assembly in assemblies:
                assembly['sample_accession'] = accession
                ass = Assembly(**assembly).save()
                sample_to_save.assemblies.append(ass)
                organism.assemblies.append(ass)
        if len(experiments) > 0:
            for experiment in experiments:
                exp = Experiment(**experiment).save()
                sample_to_save.experiments.append(exp)
                organism.experiments.append(exp)
        samples_to_save.append(sample_to_save)
        if not sample_to_save.sample_derived_from:
            organism.records.append(sample_to_save)
        if len([org for org in organisms_to_update if org.taxid == taxid]) == 0:
            organisms_to_update.append(organism)
    SecondaryOrganism.objects.insert(samples_to_save)
    for organism in organisms_to_update:
        update_status(organism)
        organism.save()
    print([sample.to_json() for sample in samples_to_save])
    append_specimens(samples_to_save)
    return


def update_status(organism):
    if organism.assemblies and organism.experiments:
        organism.trackingSystem = TrackStatus.MAP_READS
    elif organism.experiments:
        organism.trackingSystem = TrackStatus.RAW_DATA
    elif organism.assemblies:
        organism.trackingSystem = TrackStatus.ASSEMBLIES
    else:
        organism.trackingSystem = TrackStatus.SAMPLE
    # organism.save()


def append_specimens(samples):
    print('APPENDING SPECIMENS TO SAMPLE')
    for sample in samples:
        if sample.sample_derived_from and SecondaryOrganism.objects(accession=sample.sample_derived_from).first():
            derived_from = sample.sample_derived_from
            parent_sample = SecondaryOrganism.objects(accession=derived_from).first()
            if not any (sample.id == child_specimen.id for child_specimen in parent_sample.specimens):
                parent_sample.specimens.append(sample)
                parent_sample.save()
            else:
                continue
        else:
            continue            


