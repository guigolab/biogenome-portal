from datetime import datetime, timedelta
from db.models import Organism, SecondaryOrganism,TrackStatus,Assembly,Experiment
from utils import ena_client,utils
from services import sample_service,organisms_service
from mongoengine.queryset.visitor import Q



#import biosamples
def import_records(PROJECTS):
    print('STARTING IMPORT RECORDS JOB')
    samples = collect_samples(PROJECTS)
    if len(samples) == 0:
        return
    #create new sample objects
    samples_objects = get_new_samples(samples)

    print('SAMPLES TO SAVE LENGHT')
    print(len(samples_objects))

    if len(samples_objects) > 0:
        samples_accessions = [sample.accession for sample in samples_objects]
        print('SAVING SAMPLES..')
        SecondaryOrganism.objects.insert(samples_objects, load_bulk=False)
        print('NEW SAMPLES SAVED')
        print('APPENDING SPECIMENS TO SAMPLES')
        append_specimens(samples_accessions)
        print('SPECIMENS APPENDED')
    else:
        #check for new taxids , fix potentials cronjob crashes
        print('UPDATING SAMPLES..')
        #update samples created more than 15 days ago
        samples_objects = SecondaryOrganism.objects(Q(accession__ne=None) & Q(created__lte=datetime.now()- timedelta(days=15)))
        if len(samples_objects) == 0:
            print('NO SAMPLES TO UPDATE')
            return

        samples_accessions = [sample.accession for sample in samples_objects]

        print('SAMPLES TO UPDATE')
        print(len(samples_accessions))
    
    print('UPDATING ORGANISMS')
    unique_taxids = set([sample.taxid for sample in samples_objects])
    new_taxids =  [taxid for taxid in unique_taxids if taxid not in [org.taxid for org in Organism.objects(taxid__in=list(unique_taxids))]]
    
    print('NEW TAXONS LENGHT')
    print(len(new_taxids))
    for taxid in new_taxids:
        all_names = [sample.common_name for sample in samples_objects if sample.taxid == taxid and sample.common_name]
        if len(all_names) > 0:
            common_names = ''.join(list(set(all_names)))
            organisms_service.get_or_create_organism(taxid, common_names)
        else:
            organisms_service.get_or_create_organism(taxid)

    print('APPENDING SAMPLES TO ORGANISM CONTAINER')
    organisms_to_update = Organism.objects(taxid__in=list(unique_taxids))
    for org in organisms_to_update:
        if len(org.records) > 0:
            organism_records = SecondaryOrganism.objects(Q(taxid=org.taxid) & Q(id__not__in=[record.id for record in org.records]) & Q(sample_derived_from=None) & Q(accession__in=[sample.accession for sample in samples_objects if sample.taxid == org.taxid]))
        else:
            organism_records = SecondaryOrganism.objects(Q(taxid=org.taxid) & Q(sample_derived_from=None) & Q(accession__in=[sample.accession for sample in samples_objects if sample.taxid == org.taxid]))
        if len(organism_records) > 0:
            org.modify(push_all__records=organism_records)
    
    print('ORGANISMS UPDATED')

    print('BULK INSERTION EXPERIMENTS')
    new_experiments = bulk_insert_experiments(samples_accessions)
    print('EXPERIMENTS INSERTED')       
    
    print('BULK INSERTION ASSEMBLIES')
    new_assemblies = bulk_insert_assemblies(samples_accessions)
    print('ASSEMBLIES INSERTED')

    samples_accessions = get_samples_accessions(new_assemblies,new_experiments)
    print('SAMPLES WITH NEW DATA:')
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
    print('DONE')
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

#expects unique taxids
def get_new_taxons(taxids):
    unique_taxids = set([str(taxid) for taxid in taxids])
    return [taxid for taxid in unique_taxids if taxid not in [org.taxid for org in Organism.objects(taxid__in=list(unique_taxids))]]

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
            #insert 50 by 50
            if len(assemblies_to_save)>=50:
                Assembly.objects.insert(assemblies_to_save,load_bulk=False)
                assemblies_to_save=list()
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
            if len(exps_to_save)>=50:
                Experiment.objects.insert(exps_to_save,load_bulk=False)
                exps_to_save=list()
    if len(exps_to_save)>0:
        Experiment.objects.insert(exps_to_save,load_bulk=False)
    return exps_to_save

# def append_specimens():
def get_new_samples(samples):
    samples_accessions = [sample['accession'] for sample in samples]
    samples_to_save=list()
    existing_samples = SecondaryOrganism.objects(accession__in=samples_accessions).only('accession')
    if len(samples) == len(existing_samples):
        return samples_to_save
    for sample in samples:
        if sample['accession'] in existing_samples:
            #update sample in another job
            continue
        else:
            sample_obj = dict(accession = sample['accession'], taxid=str(sample['taxId']), created=datetime.utcnow())
            utils.parse_sample_metadata(sample_obj, sample['characteristics'])
            samples_to_save.append(sample_service.create_sample_object(sample_obj))
    return samples_to_save

def append_specimens(samples_accessions):
    specimens = SecondaryOrganism.objects(sample_derived_from__ne=None, accession__in=samples_accessions)
    containers_accessions = [rec.sample_derived_from for rec in specimens]
    for accession in containers_accessions:
        sample_container = SecondaryOrganism.objects(accession=accession).first()
        if sample_container:
            new_specimens = [spec for spec in specimens \
                if spec.sample_derived_from == accession and \
                    not spec.accession in [spec.fetch().accession for spec in sample_container.specimens]]
            # new_specimens = list(set(sample_specimens)-set([spec.fetch() for spec in sample_container.specimens]))
            sample_container.modify(push_all__specimens=new_specimens)
        else:
            continue
    


