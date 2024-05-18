from db.models import  BioSample
from ..utils import ena_client
from ..biosample import biosamples_service
from ..organism import organisms_service
from ..sample_location import sample_locations_service
import os

PROJECTS = os.getenv('PROJECTS')

def import_biosamples():
    if not PROJECTS:
        print("No Projects defined")
        return
    
    biosamples_to_save = []
    for project_accession in PROJECTS.split(','):
        
        print(f"IMPORTING BIOSAMPLES FOR PROJECT {project_accession}")
        
        biosamples = ena_client.retrieve_biosamples_from_ebi_by_project(project_accession)
        
        if not biosamples:
            print(f'biosamples found for project {project_accession} not found')
            continue
        
        accessions = [biosample['accession'] for biosample in biosamples]
        
        existing_biosamples = BioSample.objects(accession__in=accessions).scalar('accession')
        
        for biosample_to_parse in biosamples:
            if biosample_to_parse['accession'] in existing_biosamples:
                continue
            biosample_obj = biosamples_service.parse_biosample_from_ebi_data(biosample_to_parse)
            biosamples_to_save.append(biosample_obj)
    #Bulk insert biosamples
    BioSample.insert(biosamples_to_save)




def get_biosamples_derived_from():

    possible_parent_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": False}})
    
    possible_children_accessions = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": True}, 'sub_samples':None}).scalar("accession")
    
    biosamples_to_save = []
    for possible_parent in possible_parent_samples:
        
        ebi_biosample_response = ena_client.get_samples_derived_from(possible_parent.accession)
        
        if not ebi_biosample_response:
            continue
        
        for sample_to_save in ebi_biosample_response:
            
            if sample_to_save.get("accession") in possible_children_accessions:
                continue
            
            biosample_child = biosamples_service.parse_biosample_from_ebi_data(sample_to_save)
            biosamples_to_save.append(biosample_child)
            
            ##UPDATE COORDINATES AND COUNTRIES
            sample_locations_service.save_coordinates(biosample_child)
            sample_locations_service.update_countries_from_biosample(biosample_child, biosample_child.accession)
            
            possible_parent.save()
