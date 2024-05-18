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
from server.clients.ncbi_client import execute_ncbi_datasets

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

