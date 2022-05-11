import requests
import time
from utils import ena_client,utils
from services import sample_service,organisms_service,geo_loc_service
from db.models import Assembly,SecondaryOrganism
from mongoengine.queryset.visitor import Q
from datetime import datetime, timedelta

REL_FIELDS=['sample_same_as','sample_symbiont_of','sample_derived_from',]

SAMPLE_QUERY = (Q(last_check=None) | Q(last_check__lte=datetime.now()- timedelta(days=2)))

##import from NCBI
##retrieve assemblies with bioprojects
def import_from_NCBI(project_accession):
    assemblies = get_assemblies(project_accession)
    if assemblies:
        existing_assemblies = Assembly.objects(accession__in=[assembly['assembly_accession'] for assembly in assemblies])
        if existing_assemblies:
            assemblies = [ass for ass in assemblies if ass['assembly_accession'] not in [ex['accession'] for ex in existing_assemblies]]
        if not assemblies:
            print('NO NEW ASSEMBLIES')
            return
        parse_data(assemblies)
        print('DONE')


##retrieve assemblies by bioproject in NCBI
def get_assemblies(project_accession):
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
    return assemblies

## get biosample accession from assemblies
def parse_data(assemblies):
    samples_accessions=set()
    samples_not_found=set()
    for assembly in assemblies:
        sample_accession=assembly['biosample_accession']
        samples_accessions.add(sample_accession)
        organism = organisms_service.get_or_create_organism(str(assembly['org']['tax_id']))
        sample_obj = SecondaryOrganism.objects(accession=sample_accession).first()
        if not sample_obj:
            sample_obj = SecondaryOrganism(accession=sample_accession,taxid=organism.taxid,scientificName=organism.organism).save()
            organism.insdc_samples.append(sample_obj)
            if not 'biosample' in assembly.keys() or not 'attributes' in assembly['biosample'].keys():
                #retrieve sample metadata from EBI/BioSamples
                create_sample_from_biosamples(sample_obj, samples_not_found)
            else:
                biosample = assembly['biosample']
                sample_metadata=dict()
                for attr in biosample['attributes']:
                    sample_metadata[attr['name']] = [dict(text=attr['value'])]
                metadata = utils.parse_sample_metadata(sample_metadata)
                sample_obj.modify(**metadata)
                geo_loc_service.get_or_create_coordinates(sample_obj.to_mongo())
        ass_obj = Assembly.objects(accession = assembly['assembly_accession']).upsert_one(accession = assembly['assembly_accession'],assembly_name= assembly['display_name'], sample_accession= sample_obj.accession)
        if len(organism.assemblies) == 0 or not ass_obj.id in [ass.id for ass in organism.assemblies]:
            organism.assemblies.append(ass_obj)
            sample_obj.modify(push__assemblies=ass_obj)
        sample_service.get_reads([sample_obj])
        #save triggers status tracking
        organism.save()
    if len(list(samples_not_found))>0:
        print('SAMPLES NOT FOUND IN BIOSAMPLES: ', samples_not_found)
    print('NCBI DATA IMPORTED')
    # get_reads(samples_accessions)


def create_sample_from_biosamples(sample_obj, samples_not_found):
    resp = ena_client.get_sample_from_biosamples(sample_obj.accession)
    if '_embedded' in resp.keys():
        metadata = utils.parse_sample_metadata(resp['_embedded']['samples'][0]['characteristics'])
        sample_obj.modify(**metadata)
        geo_loc_service.get_or_create_coordinates(sample_obj.to_mongo())
    else:
        print('SAMPLE NOT FOUND')
        samples_not_found.add(sample_obj.accession)
        print(sample_obj.accession)

