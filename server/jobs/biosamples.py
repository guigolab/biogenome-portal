from db.models import BioSample
from clients import ebi_client
import os
from parsers import biosample as biosample_parser
from helpers.organism import handle_organism
from helpers.biosample import handle_biosample_location_data, handle_derived_samples
from celery import shared_task


PROJECTS = os.getenv('PROJECTS')

@shared_task(name='import_biosamples', ignore_result=False)
def import_biosamples_from_project_names():

    if not PROJECTS:
        print("No Projects defined")
        return
    
    for project_name in PROJECTS.split(','):
        
        print(f"IMPORTING BIOSAMPLES FOR PROJECT {project_name}")
        url = f"https://www.ebi.ac.uk/biosamples/samples?size=200&filter=attr%3Aproject%20name%3A{project_name}"
        saved_biosamples_counter=0
        biosamples_to_save_counter=0
        counter = 1

        while url:
            print(f"{counter}: Fetching biosamples.. ")

            fetched_biosamples, new_url = ebi_client.fetch_biosamples_from_ebi(url)

            url = new_url

            if not fetched_biosamples:
                break

            parsed_biosamples = [biosample_parser.parse_biosample_from_ebi_data(biosample) for biosample in fetched_biosamples]
            existing_accession_list = BioSample.objects(accession__in=[b.accession for b in parsed_biosamples]).scalar('accession')
            new_biosamples = [parsed_b for parsed_b in parsed_biosamples if parsed_b.accession not in existing_accession_list]
            
            biosamples_to_save_counter += len(new_biosamples)

            print(f"{counter}: New biosamples found {len(new_biosamples)}")

            for new_biosample in new_biosamples:

                print(f"{counter}: Fetching organism {new_biosample.taxid} for {new_biosample.accession}")
                organism = handle_organism(new_biosample.taxid)
                if not organism:
                    print(f"{counter}: Organism {new_biosample.taxid} not found for {new_biosample.accession}, skipping..")
                    continue

                print(f"{counter}: Saving biosample {new_biosample.accession}")
                new_biosample.save()
                saved_biosamples_counter+=1

                print(f"{counter}: Updating organism {new_biosample.taxid}")
                organism.save()

                print(f"{counter}: Handling coordinates for {new_biosample.accession}")
                handle_biosample_location_data(new_biosample)
            
            counter+=1

        print(f"Saved a total of {saved_biosamples_counter} out of {biosamples_to_save_counter} for project {project_name}")

    print("Job terminated")

@shared_task(name='get_biosamples_derived_from',ignore_result=False)
def get_biosamples_derived_from_parent():

    possible_parent_accession_list = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": False}}).scalar('accession')    
    print(f"Found a total of {len(possible_parent_accession_list)} potential parents")

    saved_samples_counter=0
    for possible_parent_accession in possible_parent_accession_list:
        print(f"Found a total of {len(possible_parent_accession_list)} possible parents")

        sub_samples = BioSample.objects(__raw__ = {'metadata.sample derived from' : possible_parent_accession}).exclude('id','created')
        if sub_samples:
            continue
        
        print(f"Fetching sub samples for {possible_parent_accession} parent")

        ebi_biosample_response = ebi_client.get_samples_derived_from(possible_parent_accession)
        
        if not ebi_biosample_response:
            print(f"No sub samples found for {possible_parent_accession} parent, skipping..")
            continue

        new_parsed_samples = [biosample_parser.parse_biosample_from_ebi_data(b) for b in ebi_biosample_response]
        
        for new_parsed_sample in new_parsed_samples:
            
            if BioSample.objects(accession=new_parsed_sample.accession):
                continue

            new_parsed_sample.save()

            handle_biosample_location_data(new_parsed_sample)
            saved_samples_counter+=1

    print(f"Saved a total of {saved_samples_counter}")


@shared_task(name='get_biosamples_parents',ignore_result=False)
def get_biosample_parents():
    
    biosample_siblings = BioSample.objects(__raw__ = {'metadata.sample derived from' : {"$exists": True}})
    
    if not biosample_siblings:
        print('No sibling to map')
        return
    
    print(f'Found a total of: {len(biosample_siblings)} potential biosample siblings')

    parent_accessions = set([sib.metadata['sample derived from'] for sib in biosample_siblings])
    
    existing_parents = BioSample.objects(accession__in=parent_accessions).scalar('accession')

    for biosample_sibling in biosample_siblings:
        
        derived_from = biosample_sibling.metadata['sample derived from']
        
        if derived_from in existing_parents:
            continue
        
        biosample_response = ebi_client.get_sample_from_biosamples(derived_from)
        
        if not biosample_response:
            print(f'Unable to retrieve parent biosample {derived_from} from EBI BioSamples API, skipping...')
            continue
        
        biosample_obj = biosample_parser.parse_biosample_from_ebi_data(biosample_response)
        biosample_obj.save()

        handle_biosample_location_data(biosample_obj)
        
        handle_derived_samples(biosample_obj)
        