from db.models import Organism,BioGenomeUser,Publication
from db.enums import GoaTStatus,PublicationSource
from helpers import organism as organism_helper, user as user_helper
from celery import shared_task

GOAT_STATUS_IMPORT_MAPPER={
    "sample_collected":GoaTStatus.SAMPLE_COLLECTED.value,
    "sample_acquired":GoaTStatus.SAMPLE_ACQUIRED.value,
    "data_generation":GoaTStatus.DATA_GENERATION.value,
    "in_assembly":GoaTStatus.IN_ASSEMBLY.value,
    "insdc_submitted":GoaTStatus.INSDC_SUBMITTED.value,
    "publication_available":GoaTStatus.PUBLICATION_AVAILABLE.value
}

@shared_task(name='goat_upload', ignore_result=False, bind=True)
def upload_goat_report(self, username, rows):
    
    errors = []
    self.update_state(state='PROGRESS', meta={'messages': ['Starting job...']})

    taxid_list = [str(row.get('ncbi_taxon_id')) for row in rows]
    existing_taxid_list = Organism.objects(taxid__in=taxid_list).scalar('taxid')
    new_taxid_list = [taxid for taxid in taxid_list if taxid not in existing_taxid_list]

    valid_rows = list(rows)
    if new_taxid_list:
        print(f"New organisms to save: {len(new_taxid_list)}")
        self.update_state(state='PROGRESS', meta={'messages': [f'Found a total of {len(new_taxid_list)} new organisms, fetchin them..']})

        created_organisms = organism_helper.create_organisms_from_ena_browser(new_taxid_list)
        if created_organisms:
            print(f"A total of {len(created_organisms)} have been created")
            self.update_state(state='PROGRESS', meta={'messages': [f"A total of {len(created_organisms)} have been created"]})

            created_taxid_list = [org.taxid for org in created_organisms]
            missing_taxid_list = [taxid for taxid in new_taxid_list if taxid not in created_taxid_list]
            
            if missing_taxid_list:
                print(f"A total of {len(missing_taxid_list)} organisms have not been found in INSDC, skipping related data")
                self.update_state(state='PROGRESS', meta={'messages': [f"A total of {len(missing_taxid_list)} organisms have not been found in INSDC, skipping related data"]})

                valid_rows = [row for row in rows if str(row.get('ncbi_taxon_id')) not in missing_taxid_list]
        else:
            print(f"Any organisms found in INSDC")
            self.update_state(state='PROGRESS', meta={'messages': [f"Any organisms found in INSDC out of {len(new_taxid_list)} organisms found in the TSV"]})

    rows_map = map_rows(valid_rows)

    organisms_to_update = Organism.objects(taxid__in=rows_map.keys())
    
    self.update_state(state='PROGRESS', meta={'messages': [f"Updating a total of {len(organisms_to_update)}"]})

    for org in organisms_to_update:


        self.update_state(state='PROGRESS', meta={'messages': [f"Updating {org.scientific_name}"]})

        data_to_update = rows_map[org.taxid]
        publication = data_to_update.get('publications')
        org.target_list_status = data_to_update.get('target_list_status')
        org.goat_status = data_to_update.get('goat_status')
        
        if publication and not any(pub.id == publication.id for pub in org.publications):
            org.publications.append(publication)

        org.save()

    self.update_state(state='PROGRESS', meta={'messages': [f'A total of {len(organisms_to_update)} have been updated']})
    user = BioGenomeUser.objects(name=username).first()

    user_helper.add_species_to_datamanager([org.taxid for org in organisms_to_update], user)

    return {'messages': errors}

def map_rows(rows):
    rows_map={}
    for row in rows:
        taxid = str(row['ncbi_taxon_id'])
        rows_map[taxid] = {}
        if row.get('sequencing_status'):
            for status in GOAT_STATUS_IMPORT_MAPPER.keys():
                if status == row['sequencing_status']:
                    rows_map[taxid]['goat_status'] = GOAT_STATUS_IMPORT_MAPPER[status]
        rows_map[taxid]['target_list_status'] = row.get('target_list_status')

        if row.get('publication_id'):
            pub_to_save = map_publication(row.get('publication_id'))
            rows_map[taxid]['publications'] = pub_to_save

    return rows_map

    
def map_publication(pub):
    publication_to_save = Publication()
    if '/' in pub:
        publication_to_save.source = PublicationSource.DOI
    if 'PMC' in pub:
        publication_to_save.source = PublicationSource.PMCID
    else:
        publication_to_save.source = PublicationSource.PMID
    publication_to_save.id = pub
    return publication_to_save