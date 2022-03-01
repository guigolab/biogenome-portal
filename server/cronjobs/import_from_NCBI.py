import requests
import time
from utils import ena_client,utils
from services import sample_service,organisms_service
from db.models import Assembly, Experiment, Organism, SecondaryOrganism,TrackStatus
from mongoengine.queryset.visitor import Q
from datetime import datetime, timedelta

REL_FIELDS=['sample_same_as','sample_symbiont_of','sample_derived_from',]

def import_from_NCBI(project_accession):
    assemblies=list()
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&filters.has_annotation=false&&page_size=100").json()
    counter = 1
    if 'assemblies' in result.keys():
        while 'next_page_token' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
            next_page_token = result['next_page_token']
            #max 3 requests per second without auth token
            if counter >= 3:
                time.sleep(1)
                counter = 0
            result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&filters.has_annotation=false&&page_size=1000&page_token={next_page_token}").json()
            counter+=1
        if 'assemblies' in result.keys():
            assemblies.extend([ass['assembly'] for ass in result['assemblies']])
    if len(assemblies) > 0:
        print(len(assemblies))
        # print(len(list(set([ass['org']['tax_id'] for ass in assemblies]))))
        ##bulk insert than link
        parse_data(assemblies)
    print('DONE')

## get biosample accession from assemblies
## avoid too many db calls parsing data in bulk one iteration per model
def parse_data(assemblies):
    samples_accessions=set()
    samples_not_found=set()
    for assembly in assemblies:
        sample_accession=assembly['biosample_accession']
        samples_accessions.add(sample_accession)
        organism = organisms_service.get_or_create_organism(str(assembly['org']['tax_id']))
        sample_obj = SecondaryOrganism.objects(accession=sample_accession).upsert_one(accession=sample_accession,taxid=organism.taxid,scientificName=organism.organism)
        if not sample_obj.id in [rec.id for rec in organism.records]:
            organism.modify(push__records=sample_obj)
            if not 'biosample' in assembly.keys() or not 'attributes' in assembly['biosample'].keys():
            #retrieve sample metadata from EBI/BioSamples
                resp = requests.get(f"https://www.ebi.ac.uk/biosamples/samples?size=1000&filter=acc:{sample_accession}").json()
                if '_embedded' in resp.keys():
                    metadata = utils.parse_sample_metadata(resp['_embedded']['samples'][0]['characteristics'])
                    sample_obj.modify(**metadata)
                else:
                    print('SAMPLE NOT FOUND')
                    samples_not_found.add(sample_accession)
                    print(sample_accession)
            else:
                biosample = assembly['biosample']
                sample_metadata=dict()
                for attr in biosample['attributes']:
                    sample_metadata[attr['name']] = [dict(text=attr['value'])]
                metadata = utils.parse_sample_metadata(sample_metadata)
                sample_obj.modify(**metadata)
        ass_obj = Assembly.objects(accession = assembly['assembly_accession']).upsert_one(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'], sample_accession= sample_obj.accession)
        if len(organism.assemblies) == 0 or not ass_obj.id in [ass.id for ass in organism.assemblies]:
            organism.modify(push__assemblies=ass_obj)
            sample_obj.modify(push__assemblies=ass_obj)
        if organism.trackingSystem not in ['Assemblies Submitted','Annotation Submitted']:
            organism.modify(trackingSystem=TrackStatus.ASSEMBLIES)
    #get reads from ENA portal API
    print('SAMPLES NOT FOUND IN BIOSAMPLES')
    print(samples_not_found)
    for accession in list(samples_accessions):
        sample =SecondaryOrganism.objects(Q(accession=accession) & Q(created__lte=datetime.now()- timedelta(days=15))).first()
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
                sample.modify(push_all__experiments=new_exps)
                organism = Organism.objects(taxid=sample.taxid).update_one(push_all__experiments=new_exps)
