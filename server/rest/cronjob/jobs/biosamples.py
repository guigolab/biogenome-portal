from db.models import  BioSample
from clients import ebi_client
import os
from parsers import biosample as biosample_parser
from helpers.organism import handle_organism
from helpers.biosample import handle_biosample_location_data, parse_and_save_biosample, handle_derived_samples

PROJECTS = os.getenv('PROJECTS')

def import_biosamples_from_project_names():
    if not PROJECTS:
        print("No Projects defined")
        return
    
    for project_accession in PROJECTS.split(','):
        
        print(f"IMPORTING BIOSAMPLES FOR PROJECT {project_accession}")
        
        biosamples = ebi_client.retrieve_biosamples_from_ebi_by_project(project_accession)
        
        if not biosamples:
            print(f'biosamples for project {project_accession} not found')
            continue
        
        accessions = [biosample['accession'] for biosample in biosamples]
        
        existing_biosamples = BioSample.objects(accession__in=accessions).scalar('accession')
        
        new_parsed_biosamples = [biosample_parser.parse_biosample_from_ebi_data(biosample) for biosample in biosamples if biosample.get('accession') not in existing_biosamples]

        print(f"New biosamples to save for project {project_accession} {len(new_parsed_biosamples)}")

        for new_parsed_biosample in new_parsed_biosamples:
            
            organism = handle_organism(new_parsed_biosample.taxid)
            if not organism:
                print(f"Organism with taxid {new_parsed_biosample.taxid} not found for sample {new_parsed_biosample.accession}")
                continue

            new_parsed_biosample.save()
            organism.save()

            handle_biosample_location_data(new_parsed_biosample)

    #Bulk insert biosamples

def get_biosamples_derived_from_parent():

    possible_parent_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": False}})
    
    possible_children_accessions = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": True}, 'sub_samples':None}).scalar("accession")
    
    for possible_parent in possible_parent_samples:
        
        ebi_biosample_response = ebi_client.get_samples_derived_from(possible_parent.accession)
        
        if not ebi_biosample_response:
            continue

        new_parsed_samples = [biosample_parser.parse_biosample_from_ebi_data(b) for b in ebi_biosample_response if b.get('accession') not in possible_children_accessions]
        
        for new_parsed_sample in new_parsed_samples:
            
            new_parsed_sample.save()

            handle_biosample_location_data(new_parsed_sample)



def get_biosample_parents():
    
    biosample_siblings = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": True}})
    
    if not biosample_siblings:
        print('No sibling to map')
        return
    
    print(f'Found a total of: {len(biosample_siblings)} biosample siblings')

    parent_accessions = set([sib.metadata['sample derived from'] for sib in biosample_siblings])
    
    existing_parents = BioSample.objects(accession__in=parent_accessions).scalar('accession')

    for biosample_sibling in biosample_siblings:
        
        derived_from = biosample_sibling.metadata['sample derived from']
        
        if derived_from in existing_parents:
            continue
        
        biosample_response = ebi_client.get_sample_from_biosamples(derived_from)
        
        if not biosample_response:
            print(f'Unable to retrieve parent biosample {derived_from} from EBI BioSamples API')
            continue
        
        biosample_obj = parse_and_save_biosample(biosample_response)
        handle_biosample_location_data(biosample_obj)
        handle_derived_samples(biosample_obj)
        