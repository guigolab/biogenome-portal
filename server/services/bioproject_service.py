from db.models import BioProject
from utils import ena_client
from mongoengine.queryset.visitor import Q

import json


def get_bioproject(accession):
    biop = BioProject.objects(accession=accession).first()
    if biop:
        response = json.loads(biop.to_json())
        response['isOpen'] = True
        response['parents'] = json.loads(BioProject.objects(accession__in=biop.parents).to_json())
        response['children'] = json.loads(BioProject.objects(parents=biop.accession).to_json())
        for child in response['children']:
            child['children'] = json.loads(BioProject.objects(parents=child['accession']).to_json())
        return response

def create_bioprojects_from_NCBI(bioprojects,organism,sample=None):
    saved_bioprojects=list()
    for projects_container in bioprojects:
        for bioproject in projects_container['bioprojects']:
            saved_pr = BioProject.objects(accession=bioproject['accession']).first()
            if not saved_pr:
                saved_pr = BioProject(accession = bioproject['accession'], title=bioproject['title']).save()
            saved_bioprojects.append(saved_pr)
            if 'parent_accessions' in bioproject.keys():
                for p_acc in bioproject['parent_accessions']:
                    saved_pr.modify(add_to_set__parents=p_acc)
    for bioproject in saved_bioprojects:
        organism.modify(add_to_set__bioprojects=bioproject.accession)
        if sample:
            sample.modify(add_to_set__bioprojects=bioproject.accession)

def create_bioproject_from_ENA(project_accession):
    if BioProject.objects(accession=project_accession).first():
        return
    resp = ena_client.get_bioproject(project_accession)
    for r in resp:
        if 'study_accession' in r.keys() and r['study_accession'] == project_accession:
            return BioProject(accession=project_accession, title=r['description']).save()

def search_bioproject(name):
    query = (Q(title__iexact=name) | Q(title__icontains=name))
    bioprojects = BioProject.objects(query).exclude('id')
    return bioprojects
