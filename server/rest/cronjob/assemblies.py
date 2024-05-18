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
from utils.clients.ncbi_client import execute_ncbi_datasets

PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'
ROOT_NODE = os.getenv('ROOT_NODE')


"""
IMPORT FUNCTIONS

SAMPLES FROM COPO:TODO
SAMPLES FROM BIOSAMPLES
EXPERIMENTS FROM ENA
GENOMES FROM NCBI BY BIOPROJECT
GENOMES FROM NCBI BY TAXON

ANNOTATIONS FROM NCBI

"""

def import_assemblies_by_bioproject(project_accession=None):

    if not project_accession:
        project_accession = os.getenv('PROJECT_ACCESSION')

    CMD = ["summary", "genome", "accession", project_accession, "--assembly-source", "GenBank", "--assembly-version", "latest"]

    result = execute_ncbi_datasets(CMD)

    reports = result.get("reports")

    if not reports:
        raise "Nothing found"
    
    existing_assemblies = Assembly.objects().scalar('accession')

    assemblies_to_save=[]
    biosamples_to_parse=[]
    organisms_to_parse=[]

    for assembly in reports:

        assembly_accession = assembly.get("accession")
        if assembly_accession in existing_assemblies:
            continue
        
        annotation_info = assembly.get("annotation_info")
        assembly_info = assembly.get("assembly_info")
        assembly_stats = assembly.get("assembly_stats")
        source_database = assembly.get("source_database")

        metadata = {
            "annotation_info": annotation_info,
            "assembly_info": assembly_info,
            "assembly_stats": assembly_stats,
            "source_database": source_database
        }

        assembly_to_save = Assembly(accession=assembly_accession, metadata=metadata)

        organism = assembly.get("organism")
        if organism:
            organisms_to_parse.append(organism)
            scientific_name = organism.get("organism_name")
            assembly_to_save.scientific_name = scientific_name

        biosample = assembly_info.get("biosample")
        if biosample:
            biosamples_to_parse.append(biosample)
            sample_accession = biosample.get("accession")
            assembly_to_save.sample_accession = sample_accession

        assemblies_to_save.append(assembly_to_save)
        print(assembly_to_save.to_json())
        break
    ##get sequences
    # CMD.extend(["--assembly-level", "chromosome","--report", "sequence", "--limit", "10"])
    print(len(assemblies_to_save))
    # sequences = execute_ncbi_datasets(CMD)    

    # print(sequences.keys())
