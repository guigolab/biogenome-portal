from db.models import BioProject
from utils.ena_client import get_bioproject
import os

ROOT_PROJECT = os.getenv('PROJECT_ACCESSION')

def create_bioprojects_from_NCBI(bioprojects,organism,sample):
    ##first save all bioprojects
    saved_bioprojects=list()
    for projects_container in bioprojects:
        for bioproject in projects_container['bioprojects']:
            saved_pr = BioProject.objects(accession=bioproject['accession']).first()
            if not saved_pr:
                saved_pr = BioProject(accession = bioproject['accession'], title=bioproject['title']).save()
            saved_bioprojects.append(saved_pr)
    ##then set relationship
    for projects_container in bioprojects:
        for bioproject in projects_container['bioprojects']:
            if 'parent_accessions' in bioproject.keys():
                project_obj = next(p for p in saved_bioprojects if p.accession == bioproject['accession'])
                for p_acc in bioproject['parent_accessions']:
                    parent_project = BioProject.objects(accession=p_acc).first()
                    project_obj.modify(add_to_set__parents=parent_project.accession)
    #                 project_obj.parents.append(BioProject.objects(accession = p_acc).first())
    for bioproject in saved_bioprojects:
        organism.modify(add_to_set__bioprojects=bioproject.accession)
        sample.modify(add_to_set__bioprojects=bioproject.accession)
        
def create_bioproject_from_ENA(project_accession):
    if BioProject.objects(accession=project_accession).first():
        return
    resp = get_bioproject(project_accession)
    for r in resp:
        if 'study_accession' in r.keys() and r['study_accession'] == project_accession:
            return BioProject(accession=project_accession, title=r['description']).save()