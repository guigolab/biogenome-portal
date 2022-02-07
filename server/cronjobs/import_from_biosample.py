from db.models import  SecondaryOrganism,TrackStatus
from utils import ena_client
#import biosamples
#track status
#FIX: passing a list or a single project??
def import_records(PROJECTS):
    samples = list()
    for project in PROJECTS:
        resp = ena_client.get_samples(project)
        if resp and '_embedded' in resp.keys():
            samples.extend(resp['_embedded']['samples'])
    if len(samples) != 0 and len(samples) == len(SecondaryOrganism.objects()):
        return
    for sample in samples:
        sample_obj = SecondaryOrganism.objects(accession = sample['accession']).first()
        if sample_obj:
            print(f'UPDATING SAMPLE: {sample_obj.accession}')
            update_sample(sample_obj)
        else:
            print('CREATING SAMPLE: '+ sample['accession'])
            create_sample(sample['characteristics'],sample['accession'],str(sample['taxId']))
    append_specimens(SecondaryOrganism.objects())


def update_status(organism):
    if organism.assemblies and organism.experiments:
        organism.trackingSystem = TrackStatus.MAP_READS
    elif organism.experiments:
        organism.trackingSystem = TrackStatus.RAW_DATA
    elif organism.assemblies:
        organism.trackingSystem = TrackStatus.ASSEMBLIES
    else:
        organism.trackingSystem = TrackStatus.SAMPLE
    organism.save()


def append_specimens(samples):
    print('APPENDING SPECIMENS TO SAMPLE')
    for sample in samples:
        if 'text' in sample.sample_derived_from.keys() and SecondaryOrganism.objects(accession=sample.sample_derived_from['text']).first():
            derived_from = sample.sample_derived_from['text']
            parent_sample = SecondaryOrganism.objects(accession=derived_from).first()
            if not any (sample.id == child_specimen.id for child_specimen in parent_sample.specimens):
                parent_sample.specimens.append(sample)
                parent_sample.save()
            else:
                continue
        else:
            continue            


