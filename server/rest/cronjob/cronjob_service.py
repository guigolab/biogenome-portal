from db.models import Organism, Assembly, BioSample, SampleCoordinates, LocalSample, Experiment
from ..utils import ena_client
from ..biosample import biosamples_service
from ..organism import organisms_service
from ..read import reads_service
from ..assembly import assemblies_service
from ..sample_location import sample_locations_service
from shapely.geometry import shape, Point
import time
import os
import requests
import json

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'

def get_biosamples_derived_from():
    possible_parent_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": False}, 'sub_samples':None})
    for possible_parent in possible_parent_samples:
        ebi_biosample_response = ena_client.get_samples_derived_from(possible_parent.accession)
        if not ebi_biosample_response:
            continue
        time.sleep(3)
        for sample_to_save in ebi_biosample_response:
            biosample_child = biosamples_service.create_biosample_from_ebi_data(sample_to_save)
            time.sleep(3)
            possible_parent.modify(add_to_set__sub_samples=biosample_child.accession)

def get_biosample_parents():
    biosample_siblings = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": True}})
    print(f'Found a total of: {len(biosample_siblings)} biosample siblings')
    if not biosample_sibling:
        print('No sibling to map')
        return
    parent_accessions = set([biosample_sibling.metadata['sample derived from'] for biosample_sibling in biosample_siblings])
    existing_parents = BioSample.objects(accession__in=parent_accessions).scalar('accession')
    for biosample_sibling in biosample_siblings:
        derived_from = biosample_sibling.metadata['sample derived from']
        if derived_from in existing_parents:
            continue
        biosample_response = ena_client.get_sample_from_biosamples(derived_from)
        if not biosample_response:
            print(f'Unable to retrieve parent biosample {derived_from} from EBI BioSamples API')
        biosample_obj = biosamples_service.create_biosample_from_ebi_data(biosample_response)
        biosample_obj.modify(add_to_set__sub_samples=biosample_sibling.accession)

#the NCBI API WILL CHANGE SOON, BETTER SWITCH TO DATASETS CLI
def import_assemblies():
    project_accession = os.getenv('PROJECT_ACCESSION')
    if not project_accession:
        return
    fetched_assemblies = []
    page_token = None

    while True:
        params = {
            "filters.reference_only": False,
            "filters.assembly_source": "all",
            "page_size": 100,
            "page_token": page_token,
        }

        try:
            response = requests.get(f"https://api.ncbi.nlm.nih.gov/datasets/v1/genome/bioproject/{project_accession}", params=params)
            response.raise_for_status()
            data = response.json()

            if "assemblies" in data:
                fetched_assemblies.extend(ass["assembly"] for ass in data["assemblies"])

            page_token = data.get("next_page_token")
            if not page_token:
                break

            time.sleep(1)  # Limit requests per second if needed

        except requests.exceptions.RequestException as e:
            print(f"An error occurred while fetching assemblies: {e}")
            break
    if not fetched_assemblies:
        print('no assemblies found')
        return
    existing_assemblies = Assembly.objects(accession__in=[assembly["assembly_accession"] for assembly in fetched_assemblies]).scalar('accession')
    for assembly in fetched_assemblies:
        assembly_accession = assembly["assembly_accession"]
        if assembly_accession in existing_assemblies:
            continue

        print(f"Importing Assembly: {assembly_accession}")
        assemblies_service.create_assembly_from_ncbi_data(assembly)

#TRACK EXPERIMENTS
def get_experiments():
    query = {'assemblies': [], 'experiments':[]}
    biosamples = BioSample.objects(**query)
    print(f'Biosamples to retrieve experiments from {len(biosamples)}')
    for biosample in biosamples:
        accessions = reads_service.create_reads_from_biosample_accession(biosample.accession)
        organism = organisms_service.get_or_create_organism(biosample.taxid)
        if not accessions:
            continue
        for acc in accessions:
            biosample.modify(add_to_set__experiments=acc)
            organism.modify(add_to_set__experiments=acc)
        biosample.save()
        organism.save()

def import_biosamples():
    if not PROJECTS:
        return
    for project_accession in PROJECTS.split(','):
        biosamples = ena_client.retrieve_biosamples_from_ebi_by_project(project_accession)
        if not biosamples:
            print('no biosamples found')
            continue
        accessions = [biosample['accession'] for biosample in biosamples]
        existing_biosamples = BioSample.objects(accession__in=accessions).scalar('accession')
        for biosample_to_save in biosamples:
            if biosample_to_save['accession'] in existing_biosamples:
                continue
            biosamples_service.create_biosample_from_ebi_data(biosample_to_save)


def update_sample_locations():
    biosamples = BioSample.objects(location__ne=None)
    local_samples = LocalSample.objects(location__ne=None)
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for biosample in biosamples:
        if biosample.accession in existing_coordinates:
            continue
        coordinates = biosample.location['coordinates']
        SampleCoordinates(taxid=biosample.taxid,
                          sample_accession=biosample.accession,
                          scientific_name=biosample.scientific_name, 
                          coordinates=coordinates).save()
    for local_sample in local_samples:
        if local_sample.local_id in existing_coordinates:
            continue
        coordinates = local_sample.location['coordinates']
        SampleCoordinates(taxid=local_sample.taxid,
                sample_accession=local_sample.local_id,
                scientific_name=local_sample.scientific_name, 
                coordinates=coordinates,
                is_local_sample=True).save()
    #get all organisms with images and add image to biosamples
    organisms = Organism.objects(image__ne=None)
    for org in organisms:
        sample_locations_service.add_image(org.taxid,org.image)

def update_countries():
    ##update from biosample
    # Collect information for all biosamples
    accession_country_map = {}
    biosamples = BioSample.objects()
    for biosample in biosamples:
        geo_loc = biosample.metadata.get('geo_loc_name')
        if not geo_loc:
            geo_loc = biosample.metadata.get('geographic location (country and/or sea)')
        
        if geo_loc:
            if ':' in geo_loc or '|' in geo_loc:
                country_name = geo_loc.split(':')[0]
            else:
                country_name = geo_loc
            accession_country_map[biosample.accession] = country_name

    # Load country polygons from JSON
    with open(COUNTRIES_PATH) as f:
        countries = json.load(f)['features']

    # Create a spatial index for country polygons
    country_polygons = [(shape(country['geometry']), country['id'], country['properties']['name']) for country in countries]

    # Iterate through saved biosamples
    for biosample in biosamples:
        accession = biosample.accession
        taxid = biosample.taxid
        country_to_add = None

        # Check if the biosample has a country name
        if accession in accession_country_map:
            country_name_to_check = accession_country_map[accession]

            # Find matching countries by name or ID
            for country_poligon in country_polygons:
                polygon, country_id, country_name = country_poligon
                if country_name_to_check == country_name:
                    country_to_add = country_id

        # If no country names found, use spatial check
        if not country_to_add:
            sample_coords = SampleCoordinates.objects(sample_accession=accession).first()

            if sample_coords:
                lng, lat = sample_coords.coordinates['coordinates']
                point = Point(lng, lat)
                for polygon in country_polygons:
                    polygon, country_id, country_name = country_poligon
                    if polygon.contains(point):
                        country_to_add = country_id

        # Perform batch update for countries
        if country_to_add:
            print(f'Adding country {country_to_add} to organism {taxid}')
            Organism.objects(taxid=taxid).modify(add_to_set__countries=country_to_add)


def get_samples_collection_date():
    biosamples = BioSample.objects(collection_date=None)
    for biosample in biosamples:
        if 'collection_date' in biosample.metadata.keys():
            collection_date = biosample.metadata['collection_date']
        elif 'collection date' in biosample.metadata.keys():
            collection_date = biosample.metadata['collection date']
        else:
            continue
        biosample.modify(collection_date=collection_date)