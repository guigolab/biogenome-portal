from db.models import BioProject,Organism
from ..utils import ena_client
from mongoengine.queryset.visitor import Q
import json

def get_bioprojects(filter=None, offset=0, limit=20, sort_column=None, sort_order=None):
    if filter:
        bioprojects = BioProject.objects( Q(title__iexact=filter) | Q(title__icontains=filter) | Q(accession__iexact=filter) | Q(accession__icontains=filter)).exclude('id')
    else:
        bioprojects = BioProject.objects().exclude('id')
    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        bioprojects = bioprojects.order_by(sort)
    return bioprojects.count(), bioprojects[int(offset):int(offset)+int(limit)]

def get_bioproject(accession):
    biop = BioProject.objects(accession=accession).exclude('id').first()
    if biop:
        resp = json.loads(biop.to_json())
        resp['children'] = json.loads(BioProject.objects(accession__in=biop.children).exclude('id').to_json())
        return resp
        
def create_bioprojects_from_NCBI(bioprojects,organism,sample):
    saved_bioprojects=list()
    for projects_container in bioprojects:
        for bioproject in projects_container['bioprojects']:
            saved_pr = BioProject.objects(accession=bioproject['accession']).first()
            if not saved_pr:
                saved_pr = BioProject(accession = bioproject['accession'], title=bioproject['title']).save()
            saved_bioprojects.append(saved_pr)
    for projects_container in bioprojects:
        for bioproject in projects_container['bioprojects']:
            if 'parent_accessions' in bioproject.keys():
                for p_acc in bioproject['parent_accessions']:
                    parent_project = BioProject.objects(accession=p_acc).first()
                    parent_project.modify(add_to_set__children=bioproject['accession'])
    for bioproject in saved_bioprojects:
        organism.modify(add_to_set__bioprojects=bioproject.accession)
        if sample:
            sample.modify(add_to_set__bioprojects=bioproject.accession)
    leaves_counter(saved_bioprojects)

def get_bioproject_coordinates(bioproject,insdc_status=None):
    query = ( Q(locations__exists=True) & Q(locations__not__size=0) & Q(bioprojects=bioproject.accession))
    return Organism.objects(query).scalar('taxid','scientific_name','locations','image').exclude('id')

def get_bioproject_countries(bioproject,insdc_status=None):
    return Organism.objects(bioprojects=bioproject.accession).item_frequencies('countries')

def create_bioproject_from_ENA(project_accession):
    bioproject =  BioProject.objects(accession=project_accession).first()
    if bioproject:
        return bioproject
    resp = ena_client.get_bioproject(project_accession)
    for r in resp:
        if 'study_accession' in r.keys() and r['study_accession'] == project_accession:
            return BioProject(accession=project_accession, title=r['description']).save()

def leaves_counter(bioproject_list):
    for node in bioproject_list:
        # node.leaves=count_species(node)
        node.leaves=Organism.objects(bioprojects=node.accession).count()
        node.save()

def dfs(stack, tree):
    node, level = stack.pop(0)
    tree["title"] = node.title
    tree["accession"] = node.accession
    tree["children"] = []
    if node.children:
        children = BioProject.objects(accession__in=node.children)
        for child in children:
            child_dict = {}
            dfs([(child, level+1)], child_dict)
            tree["children"].append(child_dict)
    return tree