from datetime import datetime, timedelta
from db.models import Organism, SecondaryOrganism,Assembly,Experiment
from utils import ena_client,utils
from services import sample_service,organisms_service
from mongoengine.queryset.visitor import Q


SAMPLE_QUERY = (Q(last_check=None) | Q(last_check__lte=datetime.now() - timedelta(days=15)))


def import_from_EBI_biosamples(PROJECTS):
    print('STARTING IMPORT RECORDS JOB')
    samples = collect_samples(PROJECTS)
    if len(samples) == 0:
        print('NO SAMPLES FOUND')
        return
    samples_accessions=[sample['accession'] for sample in samples]
    existing_samples = SecondaryOrganism.objects(accession__in=samples_accessions)
    if existing_samples.count() > 0:
        samples = [sample for sample in samples if sample['accession'] not in [ex_sam['accession'] for ex_sam in existing_samples]]
        print('NEW SAMPLES')
        print(len(samples))
    if len(samples) > 0:
        samples_accessions=[sample['accession'] for sample in samples]
        for sample in samples:
            taxid = str(sample['taxId'])
            metadata = utils.parse_sample_metadata(sample['characteristics'])
            organism = organisms_service.get_or_create_organism(taxid) ##add common names
            if not organism:
                continue
            if not 'scientifiName' in metadata.keys():
                metadata['scientificName'] = organism.organism
            metadata['taxid'] = taxid
            metadata['accession'] = sample['accession']
            sample_obj = SecondaryOrganism(**metadata).save()
            organism.records.append(sample_obj)
            organism.save()
            print('GETTING ASSEMBLIES')
            assemblies = ena_client.parse_assemblies(sample_obj.accession)
            if len(assemblies) > 0:
                existing_assemblies=Assembly.objects(accession__in=[ass['accession'] for ass in assemblies])
                if len(existing_assemblies) > 0:
                    assemblies=[ass for ass in assemblies if ass['accession'] not in [ex_as['accession'] for ex_as in existing_assemblies]]
                if len(assemblies) > 0:
                    for ass in assemblies:
                        if not 'sample_accession' in ass.keys():
                            ass['sample_accession'] = sample_obj.accession
                    assemblies = Assembly.objects.insert(assemblies)
                    organism.assemblies.extend(assemblies)
                    organism.save()
                    sample_obj.assemblies.extend(assemblies)
                    sample_obj.last_checked=datetime.utcnow()
                    sample_obj.save()
            print('GETTING READS')
            get_reads([sample_obj.accession])
        print('APPENDING SPECIMENS')
        append_specimens(samples_accessions)

def collect_samples(PROJECTS):
    samples = list()
    for project in PROJECTS:
        resp = ena_client.get_samples(project)
        if resp and '_embedded' in resp.keys():
            samples.extend(resp['_embedded']['samples'])
    return samples

def get_reads(samples_accessions):
    for accession in list(samples_accessions):
        sample = SecondaryOrganism.objects(Q(accession=accession) & SAMPLE_QUERY).first()
        if not sample:
            continue
        experiments = ena_client.get_reads(accession)
        if len(experiments) > 0:
            unique_exps=list({v['experiment_accession']:v for v in experiments}.values())
            existing_exps = Experiment.objects(experiment_accession__in=[exp['experiment_accession'] for exp in unique_exps])
            new_exps = [Experiment(**exp) for exp in unique_exps if exp['experiment_accession'] not in [exp['experiment_accession'] for exp in existing_exps]] if len(existing_exps) > 0 else [Experiment(**exp) for exp in unique_exps]
            if len(new_exps)>0:
                Experiment.objects.insert(new_exps, load_bulk=False)
                sample = SecondaryOrganism.objects(accession=accession).first()
                sample.modify(push_all__experiments=new_exps, last_check=datetime.utcnow())
                org = Organism.objects(taxid=sample.taxid).first()
                org.experiments.extend(new_exps)
                #trigger status update
                org.save()

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



    


