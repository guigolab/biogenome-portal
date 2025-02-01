from db.models import SubProject,Organism,BioGenomeUser
from helpers import data as data_helper
from mongoengine.errors import ValidationError
from werkzeug.exceptions import BadRequest, Conflict, NotFound


def get_sub_projects(args):
    return data_helper.get_items('sub_projects', args)

def get_sub_project(name):
    sub_project = SubProject.objects(name=name).first()
    if not sub_project:
        raise NotFound(description=f"SubProject with name: {name}, not found!")
    return sub_project

def create_sub_project(data):
    try:
        name = data.get('name')
        existing_project = SubProject.objects(name=name).first()
        if existing_project:
            raise Conflict(description=f"Sub Project with name {name} already exists!")
        ## check attached taxids are present
        sub_project_to_save = SubProject(**data)
        sub_project_to_save.save()
        return dict(message=f"{name} correctly created!"), 201
    except ValidationError as e:
        raise BadRequest(description=f"{e.to_dict()}")
    except Exception as e:
        raise BadRequest(description=f"{e.to_dict()}")


def delete_sub_project(name):
    proj = get_sub_project(name)
    ## remove the value for users and species
    Organism.objects(sub_project=name).update(sub_project=None)
    BioGenomeUser.objects(sub_projects__in=name).update(pull__sub_projects=name)
    #delete subproject
    proj.delete()
    return dict(message=f"{name} deleted")


def update_sub_project(name, data):
    proj = get_sub_project(name)
    proj.update(**data)
    return dict(message=f"{name} updated")

def get_related_species(name):
    get_sub_project(name)
    species = Organism.objects(sub_project=name)
    return species.to_json()

def get_related_users(name):
    get_sub_project(name)
    users = BioGenomeUser.objects(sub_projects__in=name).exclude('password')
    return users.to_json()
