from datetime import datetime
from db.models import SecondaryOrganism,Assembly
from utils import ena_client,utils
from services import sample_service,organisms_service,geo_loc_service
from mongoengine.queryset.visitor import Q

def import_from_EBI_biosamples(PROJECTS):
    print('STARTING IMPORT BIOSAMPLES JOB')
    samples = collect_samples(PROJECTS)
    if len(samples) == 0:
        print('NO SAMPLES FOUND')
        return
    samples_accessions=[sample['accession'] for sample in samples]
    existing_samples = SecondaryOrganism.objects(accession__in=samples_accessions)
    if existing_samples.count() > 0:
        samples = [sample for sample in samples if sample['accession'] not in [ex_sam['accession'] for ex_sam in existing_samples]]
        print('NEW SAMPLES: ',len(samples))
    if len(samples) > 0:
        samples_accessions=[sample['accession'] for sample in samples]
        for sample in samples:
            taxid = str(sample['taxId'])
            metadata = utils.parse_sample_metadata(sample['characteristics'])

            organism = organisms_service.get_or_create_organism(taxid) ##add common names
            if not organism:
                #TODO CALL NCBI
                continue
            if not 'scientifiName' in metadata.keys():
                metadata['scientificName'] = organism.organism
            metadata['taxid'] = taxid
            metadata['accession'] = sample['accession']
            geo_loc_service.get_or_create_coordinates(metadata)
            sample_obj = SecondaryOrganism(**metadata).save()
            if not sample_obj.sample_derived_from:
                organism.insdc_samples.append(sample_obj)
                organism.save()
            assemblies = ena_client.parse_assemblies(sample_obj.accession)
            if len(assemblies) > 0:
                print('ASSEMBLY PRESENT')
                existing_assemblies=Assembly.objects(accession__in=[ass['accession'] for ass in assemblies])
                if len(existing_assemblies) > 0:
                    assemblies=[ass for ass in assemblies if ass['accession'] not in [ex_as['accession'] for ex_as in existing_assemblies]]
                if len(assemblies) > 0:
                    for ass in assemblies:
                        if not 'sample_accession' in ass.keys():
                            ass['sample_accession'] = sample_obj.accession
                    assemblies = Assembly.objects.insert([Assembly(**ass) for ass in assemblies])
                    organism.assemblies.extend(assemblies)
                    organism.save()
                    sample_obj.assemblies.extend(assemblies)
                    sample_obj.last_checked=datetime.utcnow()
                    sample_obj.save()
            print('GETTING READS')
            sample_service.get_reads([sample_obj])
        print('APPENDING SPECIMENS')
        append_specimens(samples_accessions)
    print('DATA FROM ENA/BIOSAMPLES IMPORTED')

def collect_samples(PROJECTS):
    samples = list()
    for project in PROJECTS:
        resp = ena_client.get_samples(project)
        if resp and '_embedded' in resp.keys():
            samples.extend(resp['_embedded']['samples'])
    return samples

def append_specimens(samples_accessions):
    specimens = SecondaryOrganism.objects(sample_derived_from__ne=None, accession__in=samples_accessions)
    containers = SecondaryOrganism.objects(accession__in=[rec.sample_derived_from for rec in specimens])
    for container in containers:
        new_specimens = [spec for spec in specimens \
            if spec.sample_derived_from == container.accession and \
                not spec.accession in [spec.fetch().accession for spec in container.specimens]]
            # new_specimens = list(set(sample_specimens)-set([spec.fetch() for spec in sample_container.specimens]))
        container.modify(push_all__specimens=new_specimens)




    


