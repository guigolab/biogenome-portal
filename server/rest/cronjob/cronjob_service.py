from db.models import Organism, Assembly, BioSample, BioProject, LocalSample, set_location
from ..utils import ena_client
from ..biosample import biosamples_service
from ..organism import organisms_service
from ..read import reads_service
from ..assembly import assemblies_service
from ..bioproject import bioprojects_service
from shapely.geometry import shape, Point
from decimal import Decimal
import time
import os
import requests
import json

## get samples derived from or samples container
def update_samples():
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

def import_assemblies():
    project_accession = os.getenv('PROJECT_ACCESSION')
    if not project_accession:
        return
    fetched_assemblies=list()
    result = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}?filters.reference_only=false&filters.assembly_source=all&page_size=100").json()
    counter = 1
    print('Importing Assemblies')
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
            assembly_to_save_accession = assembly_to_save['assembly_accession']
            if assembly_to_save_accession in existing_assemblies:
                continue
            print(f'Importing Assembly: {assembly_to_save_accession}')
            saved_assembly = assemblies_service.create_assembly_from_ncbi_data(assembly_to_save)
            if not saved_assembly:
                continue
            organism = organisms_service.get_or_create_organism(saved_assembly.taxid)
            sample = BioSample.objects(accession=saved_assembly.sample_accession).first()
            bioprojects_service.create_bioprojects_from_NCBI(assembly_to_save['bioproject_lineages'],organism,sample)

def update_reads():
    biosamples = BioSample.objects()
    for biosample in biosamples:
        accessions = reads_service.create_reads_from_biosample_accession(biosample.accession)
        organism = organisms_service.get_or_create_organism(biosample.taxid)
        for acc in accessions:
            organism.modify(add_to_set__experiments=acc)

def import_biosamples():
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
                print(saved_sample.to_json())
                for parent_project in parent_bioprojects:
                    saved_sample.modify(add_to_set__bioprojects=parent_project.accession)
                    organism = organisms_service.get_or_create_organism(saved_sample.taxid)
                    organism.modify(add_to_set__bioprojects=parent_project.accession)
                bioprojects_service.leaves_counter(parent_bioprojects)

def update_countries():
    with open('./countries.json') as f:
        countries = json.load(f)['features']
        for model in [BioSample, LocalSample]:
            samples = model.objects(location__ne=None)
            for sample in samples:
                lng,lat = sample.location['coordinates']
                point = Point(lng, lat)
                for country in countries:
                    geometry=country['geometry']
                    polygon = shape(geometry)
                    if polygon.contains(point):
                        Organism.objects(taxid=sample.taxid).update(add_to_set__countries=country['id'])


def update_organism_locations():
    for organism in Organism.objects():
        for model in [BioSample, LocalSample]:
            samples = model.objects(taxid=organism.taxid,location__ne=None)
            locations = list()
            for sample in samples:
                lng,lat = sample.location['coordinates']
                decimal_lng = Decimal(str(lng))
                decimal_lat = Decimal(str(lat))
                location_exists=False
                for location in locations:
                    existing_lng, existing_lat = location
                    if existing_lat.compare(decimal_lat) == 0 and existing_lng.compare(decimal_lng) == 0:
                        location_exists=True
                if not location_exists:
                    locations.append([decimal_lng, decimal_lat])
            if locations:
                organism.locations=[[float(loc[0]), float(loc[1])] for loc in locations]
                organism.save()

def update_sample_coordinates():
    for model in [BioSample, LocalSample]:
        samples = model.objects()
        for sample in samples:
            if sample.location:
                return
            print('setting location of', sample)
            sample_metadata = sample.metadata
            lowered_keys_dict = dict()
            latitude = None
            longitude = None
            for key in sample_metadata.keys():
                low_key = key.lower()
                lowered_keys_dict[low_key] = sample_metadata[key]
            if 'lat_lon' in sample_metadata.keys():
                values = sample_metadata['lat_lon'].split(' ')
                if len(values) == 4:
                    lat,lat_value,long,long_value = values
                    latitude = '-'+lat if lat_value == 'S' else lat
                    longitude = '-'+long if long_value == 'W' else long
            elif 'lat lon' in sample_metadata.keys():
                values = sample_metadata['lat lon'].split(' ')
                if len(values) == 4:
                    lat,lat_value,long,long_value = values
                    latitude = '-'+lat if lat_value == 'S' else lat
                    longitude = '-'+long if long_value == 'W' else long
            elif 'geographic location (latitude)' in sample_metadata.keys() and 'geographic location (longitude)' in sample_metadata.keys():
                latitude = str(sample_metadata['geographic location (latitude)'])
                longitude = str(sample_metadata['geographic location (longitude)'])
            elif 'latitude' in lowered_keys_dict and 'longitude' in lowered_keys_dict:
                latitude = str(lowered_keys_dict['latitude'])
                longitude  = str(lowered_keys_dict['longitude'])
            elif 'decimal_latitude' in lowered_keys_dict and 'decimal_longitude' in lowered_keys_dict:
                latitude = str(lowered_keys_dict['decimal_latitude'])
                longitude  = str(lowered_keys_dict['decimal_longitude'])
            if latitude and longitude:
                try:
                    if any(c.isdigit() for c in str(latitude)) and any(c.isdigit() for c in str(longitude)):
                        ##replace , with .
                        if ',' in latitude and ',' in longitude:
                            latitude = latitude.replace(',', '.')
                            longitude = longitude.replace(',', '.')
                        if "'" in latitude and "'" in longitude:
                            latitude = latitude.replace("'", ".")
                            longitude = longitude.replace("'", ".")
                        if float(latitude) >= -90.0 and float(latitude) <= 90.0 and float(longitude) >= -180.0 and float(longitude) <= 180.0:
                            lng = float(longitude)
                            lat = float(latitude)
                            sample.location = [lng, lat]
                            sample.save()
                except:
                    print(f'Invalid latitude:{latitude} or longitude: {longitude} for sample:{document}')
