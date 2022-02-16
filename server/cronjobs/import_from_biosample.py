from enum import unique
from db.models import Organism, SecondaryOrganism,TrackStatus,Assembly,Experiment
from utils import ena_client,utils
from services import sample_service,organisms_service
from mongoengine.queryset.visitor import Q


#cronjob steps
#-retrieve and save samples from biosamples
#-retrieve and save assemblies and experiments
#-update organisms
#
#

# save all samples
# create taxons
# create relationships
# retrieve assemblies and experiments

#import biosamples
def import_records(PROJECTS):
    print('STARTING IMPORT RECORDS JOB')
    samples = collect_samples(PROJECTS)
    if len(samples) == 0:
        return
    samples_to_save= get_new_samples(samples)
    if len(samples_to_save) > 0:
        print('NUMBER OF SAMPLES TO SAVE:')
        print(len(samples_to_save))
        samples_accessions = [sample.accession for sample in samples_to_save]
        SecondaryOrganism.objects.insert(samples_to_save, load_bulk=False)
        print('APPENDING SPECIMENS TO SAMPLES')
        append_specimens(samples_accessions)
        taxids = set([str(sample.taxid) for sample in samples_to_save])
        new_taxids = [taxid for taxid in taxids if taxid not in [org.taxid for org in Organism.objects(taxid__in=list(taxids))]]
        print(len(new_taxids))
        #create new organisms
        print('CREATING NEW ORGANISMS')
        for taxid in new_taxids:
            organisms_service.get_or_create_organism(taxid)
        print('APPENDING SAMPLES TO SPECIES CONTAINER')
        organisms_to_update = Organism.objects(taxid__in=list(taxids))
        for org in organisms_to_update:
            organism_records = SecondaryOrganism.objects(Q(taxid=org.taxid) & Q(sample_derived_from=None) & Q(accession__in=[sample.accession for sample in samples_to_save if sample.taxid == org.taxid]))
            if len(organism_records) > 0:
                org.modify(push_all__records=organism_records)
    else:
        samples_accessions = [sample.accession for sample in SecondaryOrganism.objects()]
    print('BULK INSERTION EXPERIMENTS')
    new_experiments = bulk_insert_experiments(samples_accessions)        
    print('BULK INSERTION ASSEMBLIES')
    new_assemblies = bulk_insert_assemblies(samples_accessions)
    samples_accessions = get_samples_accessions(new_assemblies,new_experiments)
    print('SAMPLES WITH DATA:')
    print(len(samples_accessions))
    if len(samples_accessions) > 0:
        samples_to_update = SecondaryOrganism.objects(accession__in=list(set(samples_accessions)))
        print('ADDING DATA TO SAMPLES')
        for sample in samples_to_update:
            experiments = Experiment.objects(sample_accession=sample.accession)
            assemblies = Assembly.objects(sample_accession=sample.accession)
            sample.modify(push_all__experiments=[exp for exp in experiments if not exp.id in sample.experiments], push_all__assemblies=[ass for ass in assemblies if not ass.id in sample.assemblies])
        organisms_to_update = Organism.objects(taxid__in=list(set(sample.taxid for sample in samples_to_update)))
        print('ADDING DATA TO ORGANISMS')
        for org in organisms_to_update:
            records = [record.fetch().accession for record in org.records]
            experiments = Experiment.objects(sample_accession__in=records)
            assemblies = Assembly.objects(sample_accession__in=records)
            if len(experiments) > 0 and len(assemblies) > 0:
                org.modify(push_all__experiments=[exp for exp in experiments if not exp.id in org.experiments], push_all__assemblies=[ass for ass in assemblies if not ass.id in org.assemblies], trackingSystem=TrackStatus.MAP_READS)
            elif len(experiments) > 0:
                org.modify(push_all__experiments=[exp for exp in experiments if not exp.id in org.experiments], trackingSystem = TrackStatus.RAW_DATA)
            elif len(assemblies) > 0:
                org.modify(push_all__assemblies=[ass for ass in assemblies if not ass.id in org.assemblies], trackingSystem = TrackStatus.ASSEMBLIES)
            else:
                continue
    # update_organisms(organisms_to_update,samples_to_update)

def get_samples_accessions(new_assemblies, new_experiments):
    if len(new_assemblies) > 0 and len(new_experiments):
        accessions = [ass.sample_accession for ass in new_assemblies] + [exp.sample_accession for exp in new_experiments]
    elif len(new_assemblies) > 0:
        accessions = [ass.sample_accession for ass in new_assemblies]
    elif len(new_experiments):
        [exp.sample_accession for exp in new_experiments]
    else:
        accessions = list()
    return accessions

def collect_samples(PROJECTS):
    samples = list()
    for project in PROJECTS:
        resp = ena_client.get_samples(project)
        if resp and '_embedded' in resp.keys():
            samples.extend(resp['_embedded']['samples'])
    return samples


def bulk_insert_assemblies(samples_accession):
    assemblies_to_save=list()
    for accession in samples_accession:
        assemblies = ena_client.parse_assemblies(accession)
        if len(assemblies) > 0:
            existing_assemblies = Assembly.objects(accession__in=[ass['accession'] for ass in assemblies])
            if len(existing_assemblies) > 0:
                new_assemblies = [ass for ass in assemblies if ass['accession'] not in [ex_ass.accession for ex_ass in existing_assemblies]]
            else:
                new_assemblies=assemblies
            for ass in new_assemblies:
                if not 'sample_accession' in ass.keys():
                    ass['sample_accession'] = accession
            assemblies_to_save.extend([Assembly(**ass) for ass in new_assemblies])
    if len(assemblies_to_save)>0:
        Assembly.objects.insert(assemblies_to_save,load_bulk=False)
    return assemblies_to_save

def bulk_insert_experiments(samples_accessions):
    exps_to_save=list()
    for accession in samples_accessions:
        experiments = ena_client.get_reads(accession)
        if len(experiments) > 0:
            existing_experiments = Experiment.objects(experiment_accession__in=[exp['experiment_accession'] for exp in experiments])
            if len(existing_experiments) > 0:
                new_experiments = [exp for exp in experiments if exp['experiment_accession'] not in [ex_exp.experiment_accession for ex_exp in existing_experiments]]
            else:
                new_experiments = experiments
            exps_to_save.extend([Experiment(**exp) for exp in new_experiments])
    if len(exps_to_save)>0:
        Experiment.objects.insert(exps_to_save,load_bulk=False)
    return exps_to_save

def update_organisms(organisms_to_update, samples_to_save):
    print(organisms_to_update)
    for organism in organisms_to_update:
        organism_records = SecondaryOrganism.objects(Q(taxid=organism.taxid) & Q(accession__in=[sample.accession for sample in samples_to_save if sample.taxid == organism.taxid]))
        experiments = Experiment.objects(sample_accession__in=[rec.accession for rec in organism_records])
        assemblies = Assembly.objects(sample_accession__in=[rec.accession for rec in organism_records])
        if len(assemblies) > 0 and len(experiments) > 0:
            organism.modify(push_all__assemblies=assemblies, push_all__experiments=experiments, trackingSystem=TrackStatus.MAP_READS)
        elif len(experiments) > 0:
            organism.modify(push_all__experiments=experiments, trackingSystem = TrackStatus.RAW_DATA)
        elif len(assemblies) > 0:
            organism.modify(push_all__assemblies=assemblies, trackingSystem = TrackStatus.ASSEMBLIES)
        else:
            continue
    print('DONE')
    # organism.save()

# def append_specimens():
def get_new_samples(samples):
    samples_to_save=list()
    existing_samples = SecondaryOrganism.objects(accession__in=[sample['accession'] for sample in samples])
    for sample in samples:
        if sample['accession'] in [ex_sample.accession for ex_sample in existing_samples]:
            #update sample in another job
            continue
        else:
            sample_obj = dict(accession = sample['accession'], taxid=str(sample['taxId']))
            utils.parse_sample_metadata(sample_obj, sample['characteristics'])
            samples_to_save.append(sample_service.create_sample_object(sample_obj))
    return samples_to_save

def append_specimens(samples_accessions):
    specimens = SecondaryOrganism.objects(sample_derived_from__ne=None, accession__in=samples_accessions)
    containers_accessions = [rec.sample_derived_from for rec in specimens]
    for accession in containers_accessions:
        sample_container = SecondaryOrganism.objects(accession=accession).first()
        if sample_container:
            sample_specimens = [spec for spec in specimens if spec.sample_derived_from == accession]
            new_specimens = list(set(sample_specimens)-set([spec.fetch() for spec in sample_container.specimens]))
            sample_container.modify(push_all__specimens=new_specimens)
        else:
            continue
    


