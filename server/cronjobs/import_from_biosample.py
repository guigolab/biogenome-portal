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

#import biosamples
def import_records(PROJECTS):
    print('STARTING IMPORT RECORDS JOB')
    samples = collect_samples(PROJECTS)
    print('TOTAL SAMPLES COLLECTED:')
    print(len(samples))

    print('SAMPLE DB COLLECTION SIZE:')
    print(len(SecondaryOrganism.objects()))
    if len(samples) == 0 or \
        (len(samples) > 0 and len(samples) == len(SecondaryOrganism.objects())):
        return
    samples_to_save= get_samples_to_save(samples)
    print('NUMBER OF SAMPLES TO SAVE:')
    print(len(samples_to_save))
    if len(samples_to_save) == 0:
        return
    samples_accessions = [sample.accession for sample in samples_to_save]
    SecondaryOrganism.objects.insert(samples_to_save, load_bulk=False)
    append_specimens(samples_accessions)
    print('BULK INSERTION ASSEMBLIES')
    bulk_insert_assemblies(samples_accessions)
    print('BULK INSERTION EXPERIMENTS')
    bulk_insert_experiments(samples_accessions)
    e = len(Experiment.objects())
    print(f'all assemblies length -----> {e}')
    c = len(Assembly.objects())
    print(f'all assemblies length -----> {c}')
    #add to organism
    taxids = {*[str(sample.taxid) for sample in samples_to_save]}
    print(list(taxids))
    a = len(SecondaryOrganism.objects())
    print(f'all samples length -----> {a}')
    existing_taxids = set([org.taxid for org in Organism.objects(taxid__in=list(taxids))])
    new_taxids = list(taxids - existing_taxids)
    #create new organisms
    print('ORGANISM UPDATE')
    for taxid in new_taxids:
        organisms_service.get_or_create_organism(taxid)
    #create relationships
    update_organisms(Organism.objects(taxid__in=list(taxids)),samples_to_save)

def collect_samples(PROJECTS):
    samples = list()
    for project in PROJECTS:
        resp = ena_client.get_samples(project)
        if resp and '_embedded' in resp.keys():
            samples.extend(resp['_embedded']['samples'])
    return samples


def bulk_insert_assemblies(samples_accessions):
    assemblies_to_save=list()
    for accession in samples_accessions:
        assemblies = ena_client.parse_assemblies(accession)
        if len(assemblies) > 0:
            for ass in assemblies:
                if not 'sample_accession' in ass.keys():
                    ass['sample_accession'] = accession
        assemblies_to_save.extend([Assembly(**ass) for ass in assemblies])
    if len(assemblies_to_save)>0:
        Assembly.objects.insert(assemblies_to_save,load_bulk=False)

def bulk_insert_experiments(samples_accessions):
    exps_to_save=list()
    for accession in samples_accessions:
        experiments = ena_client.get_reads(accession)
        if len(experiments) > 0:
            exps_to_save.extend([Experiment(**exp) for exp in experiments])
    if len(exps_to_save)>0:
        Experiment.objects.insert(exps_to_save,load_bulk=False)

def update_organisms(organisms_to_update, samples_to_save):
    print(organisms_to_update)
    for organism in organisms_to_update:
        print(organism)
        print([sample.accession for sample in samples_to_save if sample.taxid == organism.taxid])
        organism_records = SecondaryOrganism.objects(Q(taxid__exact=organism.taxid) & Q(sample_derived_from=None) & Q(accession__in=[sample.accession for sample in samples_to_save if sample.taxid == organism.taxid]))
        print(len(organism_records))
        experiments = Experiment.objects(sample_accession__in=[rec.accession for rec in organism_records])
        print(len(experiments))
        assemblies = Assembly.objects(sample_accession__in=[rec.accession for rec in organism_records])
        print(len(assemblies))
        if len(assemblies) > 0 and len(experiments) > 0:
            organism.modify(push_all__assemblies=assemblies, push_all__experiments=experiments, push_all__records=organism_records, trackingSystem=TrackStatus.MAP_READS)
        elif len(experiments) > 0:
            organism.modify(push_all__experiments=experiments,push_all__records=organism_records, trackingSystem = TrackStatus.RAW_DATA)
        elif len(assemblies) > 0:
            organism.modify(push_all__assemblies=assemblies,push_all__records=organism_records, trackingSystem = TrackStatus.ASSEMBLIES)
        else:
            organism.modify(push_all__records=organism_records)
    print('DONE')
    # organism.save()

# def append_specimens():
def get_samples_to_save(samples):
    samples_to_save=list()
    existing_samples = SecondaryOrganism.objects(accession__in=[sample['accession'] for sample in samples])
    print(f'existing samples are {existing_samples}')
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
    print('APPENDING SPECIMENS TO SAMPLE')
    specimens = SecondaryOrganism.objects(sample_derived_from__ne=None,accession__in=samples_accessions)
    containers_accessions = [rec.sample_derived_from for rec in specimens]
    print(len(containers_accessions))
    for accession in containers_accessions:
        print('SAMPLE CONTAINER ACCESSION:')
        print(accession)
        sample_container = SecondaryOrganism.objects(accession=accession).first()
        if sample_container:
            sample_specimens = [spec for spec in specimens if spec.sample_derived_from == accession]
            print('SAMPLE SPECIMENS LENGTH')
            print(len(sample_specimens))
            new_specimens = list(set(sample_specimens)-set([spec.fetch() for spec in sample_container.specimens]))
            sample_container.modify(push_all__specimens=new_specimens)
        else:
            continue


# def update_records():

    # for sample in samples:
    #     derived_from = sample.sample_derived_from
    #     parent_sample = SecondaryOrganism.objects(accession=derived_from)
    #     if parent_sample.specimens and not any (sample.id == child_specimen.id for child_specimen in parent_sample.specimens):
    #         parent_sample.update_one(push__specimens=sample)

    #     if len(parent_sample) == 1 :
    #     else:
    #         continue        


