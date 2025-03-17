from db.models import LocalSample,BioGenomeUser
from helpers import organism as organism_helper, user as user_helper, geolocation as geoloc_helper, data as data_helper
from celery import shared_task,states
from celery.exceptions import Ignore

OPTIONS = ['SKIP','UPDATE']
"""
STEPS:
    VALIDATE HEADER
    VALIDATE OPTION
    VALIDATE ROWS
    VALIDATE USER PERMISSIONS
    MAP SAMPLES
    RETRIEVE TAXONS
    CREATE TAXONS
    SAVE SAMPLES 
    UPDATE TAXONS 
"""
@shared_task(name='samples_upload', ignore_result=False, bind=True)
def upload_samples_spreadsheet(self, username, samples, option="SKIP", source=None):

    samples_updated=0
    samples_created=0
    samples_skipped=0
    total_samples = 0

    self.update_state(state=states.PENDING, meta={'messages': ['Starting job...']})
    user = BioGenomeUser.objects(name=username).first()

    ##MAP SAMPLES INTO DB MODEL
    mapped_samples = [LocalSample(user=user.name, **s) for s in samples]

    total_samples = len(mapped_samples)
    pre_existing_samples = LocalSample.objects(local_id__in=[s.local_id for s in mapped_samples])

    if option == 'UPDATE':
        self.update_state(state=states.PENDING, meta={'messages': [f'Found a total of new {len(pre_existing_samples)} samples to save']})

        for existing_sample in pre_existing_samples:
            for s in mapped_samples:
                if s.local_id == existing_sample.local_id:
                    existing_sample.update(taxid=s.taxid,broker=source,metadata=s.metadata)
                    existing_sample.reload()
                    geoloc_helper.save_coordinates(existing_sample,'local_id')
                    geoloc_helper.update_countries_from_biosample(existing_sample, existing_sample.local_id)
    
        samples_updated=len(pre_existing_samples)
    else:
        samples_skipped = len(pre_existing_samples)

    pre_existing_id_list = pre_existing_samples.scalar('local_id')

    new_mapped_sample_list = [s for s in mapped_samples if s.local_id not in pre_existing_id_list]

    if new_mapped_sample_list:
        new_mapped_samples = organism_helper.handle_taxonomic_ids(new_mapped_sample_list)

        if new_mapped_samples:
            self.update_state(state=states.PENDING, meta={'messages': [f'Found a total of new {len(new_mapped_samples)} samples to save']})
                
            for mapped_sample in new_mapped_samples:
                
                try:
                    saved_sample = LocalSample(**mapped_sample).save()
                    samples_created+=1
                    geoloc_helper.save_coordinates(saved_sample, 'local_id')
                    geoloc_helper.update_countries_from_biosample(saved_sample,saved_sample.local_id)
                    organism = organism_helper.handle_organism(saved_sample.taxid)
                    data_helper.update_lineage(saved_sample, organism)
                except Exception as e:
                    messages = ['Job completed with the following stats',
                          f'TOTAL SAMPLES: {total_samples}', 
                          f'SAMPLES CREATED {samples_created}', 
                          f'SAMPLES UPDATED {samples_updated}',
                          f'SAMPLES SKIPPED {samples_skipped}' ]
                    messages.append(f"Error for sample: {mapped_sample['local_id']} of species {mapped_sample['scientific_name']}: {e}")
                    self.update_state(state='ERROR', meta={'messages':messages})
                    raise Ignore()       
                     
            self.update_state(state=states.PENDING, meta={'messages': [f'A total of {samples_created} new samples have been saved']})
            
            samples_skipped = len(new_mapped_samples) - samples_created


    user_helper.add_species_to_datamanager([s.taxid for s in new_mapped_samples], user)

    return {'messages': ['Job completed with the following stats',
                          f'TOTAL SAMPLES: {total_samples}', 
                          f'SAMPLES CREATED {samples_created}', 
                          f'SAMPLES UPDATED {samples_updated}',
                          f'SAMPLES SKIPPED {samples_skipped}' ]}
    