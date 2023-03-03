from db.models import Organism, Assembly, BioSample, BioProject, LocalSample
from db.enums import CronJobStatus
from ..utils import ena_client
from ..biosample import biosamples_service
from ..organism import organisms_service
from ..read import reads_service
from ..assembly import assemblies_service
from ..bioproject import bioprojects_service
from mongoengine.queryset.visitor import Q
import time
import os
import requests
import json

## get samples derived from or samples container
def update_samples(cronjob):
    biosamples = BioSample.objects()
    counter=0
    for biosample in biosamples:
        if counter >= 3:
            time.sleep(3)
            counter=0
        if 'sample derived from' in biosample.metadata.keys() and biosample.metadata['sample derived from']:
            sample_derived_from_accession = biosample.metadata['sample derived from']
            if BioSample.objects(accession=sample_derived_from_accession).first():
                continue
            ebi_biosample_response = ena_client.get_sample_from_biosamples(sample_derived_from_accession)
            counter = counter + 1
            if not ebi_biosample_response:
                continue
            biosamples_service.create_biosample_from_ebi_data(ebi_biosample_response[0])
        else:
            ebi_biosample_response = ena_client.get_samples_derived_from(biosample.accession)
            counter = counter + 1
            if not ebi_biosample_response:
                continue
            for sample_to_save in ebi_biosample_response:
                biosamples_service.create_biosample_from_ebi_data(sample_to_save)
    cronjob.delete()

def import_assemblies(cronjob):
    project_accession = os.getenv('PROJECT_ACCESSION')
    if not project_accession:
        return
    fetched_assemblies=list()
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&page_size=100").json()
    counter = 1
    if 'assemblies' in result.keys():
        while 'next_page_token' in result.keys():
            fetched_assemblies.extend([ass['assembly'] for ass in result['assemblies']])
            next_page_token = result['next_page_token']
            #max 3 requests per second without auth token
            if counter >= 3:
                time.sleep(1)
                counter = 0
            result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&page_size=100&page_token={next_page_token}").json()
            counter+=1
        if 'assemblies' in result.keys():
            fetched_assemblies.extend([ass['assembly'] for ass in result['assemblies']])
    if fetched_assemblies:
        accessions = [assembly['assembly_accession'] for assembly in fetched_assemblies]
        existing_assemblies = Assembly.objects(accession__in=accessions).scalar('accession')
        for assembly_to_save in fetched_assemblies:
            if assembly_to_save['assembly_accession'] in existing_assemblies:
                continue
            saved_assembly = assemblies_service.create_assembly_from_ncbi_data(assembly_to_save)
            if not saved_assembly:
                continue
            organism = organisms_service.get_or_create_organism(saved_assembly.taxid)
            sample = BioSample.objects(accession=saved_assembly.sample_accession).first()
            bioprojects_service.create_bioprojects_from_NCBI(assembly_to_save['bioproject_lineages'],organism,sample)
    cronjob.delete()



def update_reads(cronjob):
    biosamples = BioSample.objects()
    for biosample in biosamples:
        reads_service.create_reads_from_biosample_accession(biosample.accession)
    cronjob.delete()


def import_biosamples(cronjob):
    project_list = [p.strip() for p in os.getenv('PROJECTS').split(',') if p] if os.getenv('PROJECTS') else None
    project_mapper = {p.split('_')[0]:p.split('_')[1] for p in project_list}

    for project_accession in project_mapper.keys():
        biosamples = []
        href = f"https://www.ebi.ac.uk/biosamples/samples?size=200&filter=attr%3Aproject%20name%3A{project_accession}"
        resp = requests.get(href).json()
        while 'next' in resp['_links'].keys():
            time.sleep(2)
            href=resp['_links']['next']['href']
            existing_accessions = BioSample.objects(accession__in=[sample['accession'] for sample in resp['_embedded']['samples']]).scalar('accession')
            for sample in resp['_embedded']['samples']:
                if sample['accession'] in existing_accessions:
                    continue
                biosamples.append(sample)
            resp = requests.get(href).json()
        if biosamples:
            parent_bioprojects = [BioProject.objects(accession=project_mapper[project_accession]).first()]
            if not parent_bioprojects:
                parent_bioprojects = [bioprojects_service.create_bioproject_from_ENA(project_mapper[project_accession])]
                if parent_bioprojects:
                    parent_bioprojects.extend(BioProject.objects(children=project_mapper[project_accession]))
            for biosample_to_save in biosamples:
                saved_sample = biosamples_service.create_biosample_from_ebi_data(biosample_to_save)
                if not saved_sample:
                    continue
                for parent_project in parent_bioprojects:
                    saved_sample.modify(add_to_set__bioprojects=parent_project.accession)
                    organism = organisms_service.get_or_create_organism(saved_sample.taxid)
                    organism.modify(add_to_set__bioprojects=parent_project.accession)
                bioprojects_service.leaves_counter(parent_bioprojects)
    cronjob.delete()


def update_countries(cronjob):
    with open('./countries.json') as f:
        countries = json.load(f)['features']
        organisms = Organism.objects()
        countries_to_save=list()
        for organism in organisms:
            for country in countries:
                geometry = country['geometry']
                query = (Q(taxid__in=organism.taxid) & Q(location__geo_within=geometry))
                for model in [BioSample,LocalSample]:
                    samples = model.objects(query)
                    if samples:
                        countries_to_save.append(country['id'])
            if countries_to_save:
                organism.update(countries=countries_to_save)
    cronjob.delete()
