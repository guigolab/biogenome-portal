from db.models import Organism, Assembly, BioSample, SampleCoordinates, LocalSample, Read,Experiment,Chromosome,ComputedTree
from ..utils import ena_client,genomehubs_client
from ..biosample import biosamples_service
from ..organism import organisms_service
from ..read import reads_service
from ..taxonomy import taxonomy_service
from ..assembly import assemblies_service
from ..sample_location import sample_locations_service
from shapely.geometry import shape, Point
import time
import os
import requests
import json
import datetime

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'
ROOT_NODE = os.getenv('ROOT_NODE')

def compute_tree():
    tree = taxonomy_service.create_tree(ROOT_NODE)
    computed_tree = ComputedTree.objects().first()
    if not computed_tree:
        computed_tree = ComputedTree()
    computed_tree.tree = tree
    computed_tree.last_update = datetime.datetime.now()
    computed_tree.save()



def get_biosamples_derived_from():

    possible_parent_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": False}, 'sub_samples':None})
    
    for possible_parent in possible_parent_samples:
        
        ebi_biosample_response = ena_client.get_samples_derived_from(possible_parent.accession)
        
        if not ebi_biosample_response:
            continue
        
        for sample_to_save in ebi_biosample_response:
            biosample_child = biosamples_service.parse_biosample_from_ebi_data(sample_to_save)
            biosample_child.save()
            sample_locations_service.save_coordinates(biosample_child)
            sample_locations_service.update_countries_from_biosample(biosample_child)
            possible_parent.save()

def get_biosample_parents():
    
    biosample_siblings = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": True}})

    print(f'Found a total of: {len(biosample_siblings)} biosample siblings')
    
    if not biosample_siblings:
        print('No sibling to map')
        return
   
    parent_accessions = set([sib.metadata['sample derived from'] for sib in biosample_siblings])
    
    existing_parents = BioSample.objects(accession__in=parent_accessions).scalar('accession')

    for biosample_sibling in biosample_siblings:
        
        derived_from = biosample_sibling.metadata['sample derived from']
        
        if derived_from in existing_parents:
            continue
        
        biosample_response = ena_client.get_sample_from_biosamples(derived_from)
        
        if not biosample_response:
            print(f'Unable to retrieve parent biosample {derived_from} from EBI BioSamples API')
        
        biosample_obj = biosamples_service.parse_biosample_from_ebi_data(biosample_response)
        biosample_obj.save()

        sample_locations_service.save_coordinates(biosample_obj)
        sample_locations_service.update_countries_from_biosample(biosample_obj)
        

#the NCBI API WILL CHANGE SOON, BETTER SWITCH TO DATASETS CLI
def import_assemblies():
    project_accession = os.getenv('PROJECT_ACCESSION')
    biosamples = list(BioSample.objects().scalar('accession'))
    if not project_accession:
        return
    
    print(f"IMPORTING ASSEMBLIES FOR: {project_accession}")
    fetched_assemblies = []
    
    page_token = None

    while True:
        params = {
            "filters.reference_only": False,
            "filters.assembly_source": "genbank",
            "filters.assembly_version": "current",
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
    else:
        print(f"A total of {len(fetched_assemblies)} found under {project_accession}")
    existing_assemblies = Assembly.objects(accession__in=[assembly["assembly_accession"] for assembly in fetched_assemblies]).scalar('accession')
    existing_chromosomes = list(Chromosome.objects().scalar('accession_version')) ## avoid duplicate chromosomes
    assemblies_to_save = []
    for assembly in fetched_assemblies:

        assembly_accession = assembly["assembly_accession"]
        
        if assembly_accession in existing_assemblies:
            continue

        print(f"Importing Assembly: {assembly_accession}")
        
        assembly_obj, chromosomes = assemblies_service.parse_assembly_from_ncbi_data(assembly)
                
        organism = organisms_service.get_or_create_organism(assembly_obj.taxid)
        
        #skip assembly if the taxid is not found
        if not organism:
            print( f"Organism {assembly_obj.taxid} of assembly {assembly_accession} not found in INSDC")
            continue

        if chromosomes:
            Chromosome.objects.insert([chr for chr in chromosomes if chr.accession_version not in existing_chromosomes])
            new_accessions = [chr.accession_version for chr in chromosomes]
            assembly_obj.chromosomes = new_accessions
            existing_chromosomes.extend(new_accessions)

        assemblies_to_save.append(assembly)
        assembly_obj.save()

        biosample_accession = assembly.get('biosample_accession')
        
        if biosample_accession:

            if not biosample_accession in biosamples:

                if assembly.get('biosample') and assembly.get('biosample').get('attributes'):
                    biosample_object = biosamples_service.parse_biosample_from_ncbi_data(assembly)
                    biosample_object.save()
                    biosamples.append(biosample_object.accession)
                    sample_locations_service.save_coordinates(biosample_object)
                    sample_locations_service.update_countries_from_biosample(biosample_object)
                else:
                    biosamples_service.create_biosample_from_accession(assembly.get('biosample_accession'))

            #update biosample status
            BioSample.objects(accession=biosample_accession).first().save()

        organism.save()
        #update organism status

def fix_experiments_biosample_attribute():
    experiments = Experiment.objects()
    for experiment in experiments:
        if experiment.sample_accession:
            continue
        experiment.sample_accession = experiment.metadata.get('sample_accession')
        experiment.save()

def fix_experiments_metadata():
    reads = Read.objects()
    seen_experiments=set()
    for read in reads:
        experiment_accession = read.experiment_accession
        if experiment_accession in seen_experiments:
            continue
        existing_experiment = Experiment.objects(experiment_accession=experiment_accession).first()
        experiment_to_save = dict(experiment_accession=experiment_accession)
        for f in ['sample_accession', 'instrument_model', 'instrument_platform']:
            experiment_to_save[f] = read.metadata.get(f)
        experiment_to_save['taxid'] = read.metadata.get('tax_id')
        metadata = {k:v for k,v in read.metadata.items() if k in ['scientific_name', 'experiment_title','study_title', 'center_name','first_created']}
        experiment_to_save['metadata'] = metadata
        seen_experiments.add(experiment_accession)
        
        if existing_experiment:
            existing_experiment.update(**experiment_to_save)
        else:
            Experiment(**experiment_to_save).save()

#TRACK EXPERIMENTS
def get_experiments():
    biosamples = BioSample.objects()

    print(f'Biosamples to retrieve experiments from {len(biosamples)}')

    existing_reads = Read.objects().scalar('run_accession')


    for biosample in biosamples:
        print(f"Retrieving reads from biosample {biosample.accession}")
        accession = biosample.accession

        reads_to_save=[]

        ebi_reads = ena_client.get_reads_link_from_sample_accession(accession)

        for ebi_read in ebi_reads:
            run_acc = ebi_read.get('run_accession')
            #check if read is not present
            if run_acc not in existing_reads:
                reads_to_save.append(run_acc)

        parsed_reads = []
        for read_accession in reads_to_save:
            parsed_reads.extend(reads_service.parse_ena_reads(read_accession))

        if not parsed_reads:
            continue
        # print(parsed_reads)
        Read.objects.insert(parsed_reads)

        mapped_experiments = reads_service.map_experiments_from_reads(parsed_reads)

        existing_experiments = Experiment.objects(experiment_accession__in=[exp.experiment_accession for exp in mapped_experiments]).scalar('experiment_accession')
        
        experiments_to_save = []
        for mapped_exp in mapped_experiments:
            if mapped_exp.experiment_accession in existing_experiments:
                continue
            experiments_to_save.append(mapped_exp)

        if not experiments_to_save:
            continue

        Experiment.objects.insert(experiments_to_save)
        
        biosample.save()
        #update organism status
        organism = organisms_service.get_or_create_organism(biosample.taxid)
        organism.save()


def import_biosamples():
    if not PROJECTS:
        print("No Projects defined")
        return
    
    for project_accession in PROJECTS.split(','):
        print(f"IMPORTING BIOSAMPLES FOR PROJECT {project_accession}")
        biosamples = ena_client.retrieve_biosamples_from_ebi_by_project(project_accession)
        if not biosamples:
            print(f'any biosample found for project {project_accession}')
            continue
        accessions = [biosample['accession'] for biosample in biosamples]
        existing_biosamples = BioSample.objects(accession__in=accessions).scalar('accession')
        for biosample_to_parse in biosamples:
            if biosample_to_parse['accession'] in existing_biosamples:
                continue
            biosample_obj = biosamples_service.parse_biosample_from_ebi_data(biosample_to_parse)

            organism = organisms_service.get_or_create_organism(biosample_obj.taxid)
            if not organism:
                print(f"Organism {biosample_obj.taxid} not found in INSDC")
                print(f"Skipping biosample {biosample_to_parse.accession}")
                continue
            biosample_obj.save()
            sample_locations_service.save_coordinates(biosample_obj)
            sample_locations_service.update_countries_from_biosample(biosample_obj)

            #update organism status
            organism.save()

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


# def remove_orphan_links():
#     organisms = Organism.objects()
#     for organism in organisms:
def remove_orphan_local_samples():
    organisms = Organism.objects(local_samples__not__size=0)
    for organism in organisms:
        local_samples = LocalSample.objects(local_id__in=organism.local_samples).scalar('local_id')
        for id in organism.local_samples:
            if id not in local_samples:
                organism.modify(pull__local_samples=id)


def add_blob_link():
    assemblies = Assembly.objects(blobtoolkit_id=None)
    for ass in assemblies:
        response = genomehubs_client.get_blobtoolkit_id(ass.accession)
        if len(response) and 'names' in response[0].keys() and len(response[0]['names']):
            ass.blobtoolkit_id = response[0]['names'][0]
            ass.save()

def create_biosample_coordinates():
    biosamples = BioSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for biosample in biosamples:
        if biosample.accession in existing_coordinates:
            continue
        sample_locations_service.save_coordinates(biosample)

def create_local_sample_coordinates():
    local_samples = LocalSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for local_sample in local_samples:
        if local_sample.local_id in existing_coordinates:
            continue
        sample_locations_service.save_coordinates(local_sample,id_field='local_id')
