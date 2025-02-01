from db.models import BioGenomeUser,Organism,LocalSample
from db.enums import Roles
from datetime import timedelta
from mongoengine.queryset.visitor import Q
from werkzeug.exceptions import BadRequest, Conflict, NotFound
from helpers import data as data_helper
from flask import Response
from flask_jwt_extended import create_access_token, set_access_cookies
import json


def get_users(offset=0,limit=20,
                filter=None):
    limit, offset = data_helper.get_pagination({'limit':limit, 'offset':offset})
    if filter:
        users = BioGenomeUser.objects(Q(name__iexact=filter) | Q(name__icontains=filter))
    else:
        users = BioGenomeUser.objects()
    users = users.exclude('password','id').skip(offset).limit(limit)
    total = users.count()
    return {'total': total, 'data': list(users.as_pymongo())}

def get_user(name):
    user = BioGenomeUser.objects(name=name).exclude('id').first()
    if not user:
        raise NotFound(description=f"User {name} not found")
    return user


def check_user(name):
    user = BioGenomeUser.objects(name=name).first()
    if not user:
        raise NotFound(description=f"User {name} not found")
    return user

def create_user(data):

    required_fields = ['name','password','role']
    missing_fields = [field for field in required_fields if field not in data]
    if missing_fields:
        raise BadRequest(description=f"Missing required files: {', '.join(missing_fields)}")
        
    username = data['name']
    if BioGenomeUser.objects(name=username).first():
        raise Conflict(description=f"{username} already exists")
    
    if not data['role'] in ['DataManager', 'Admin']:
        raise BadRequest(description="Role must be either DataManager or Admin")
    
    user_species = set(data.get('species', []))
    if user_species:
        # Retrieve the set of species taxids that exist in the database
        existing_species = set(Organism.objects(taxid__in=user_species).scalar('taxid'))

        # Find the missing species by using set difference
        missing_species = user_species - existing_species

        if missing_species:
            missing_species_str = ", ".join(str(sp) for sp in missing_species)
            raise NotFound(description=f"The following species were not found: {missing_species_str}. Please create them first.")

    BioGenomeUser(**data).save()
    return username

def update_user(name, data):

    user = check_user(name)
    user.update(**data)
    return name

def delete_user(name):
    user = check_user(name)
    name = user.name
    user.delete()
    return name

def login_user(payload):
    name = payload.get('name')
    password = payload.get('password')
    if not name or not password:
        return Response(json.dumps(dict(msg=f"Bad user or password")), mimetype="application/json", status=401)
    
    user_obj = BioGenomeUser.objects(name=name, password=password).exclude('id','password').first()
    if not user_obj:
        return Response(json.dumps(dict(msg=f"Bad user or password")), mimetype="application/json", status=401)
    response = user_obj.to_mongo().to_dict()
    access_token = create_access_token(identity=response,expires_delta=timedelta(days=7),additional_claims={"role": user_obj.role.value, "username":user_obj.name})
    response = Response(json.dumps(response), mimetype="application/json", status=200)
    set_access_cookies(response, access_token)
    return response  


##return all species if admin
def get_related_species(name, filter=None, offset=0, limit=10):
    user = get_user(name)
    limit, offset = data_helper.get_pagination({'limit':limit, 'offset':offset})
    q_query = get_organisms_filter(filter)
   
    if user.role.value == Roles.DATA_MANAGER.value:
        species_query = Q(taxid__in=user.species)
        q_query = q_query & species_query if q_query else species_query
        
    if q_query:
        organisms = Organism.objects(q_query).exclude('id').skip(offset).limit(limit)
    else:
        organisms = Organism.objects().exclude('id').skip(offset).limit(limit)
    total = organisms.count()
    return data_helper.dump_json({'total':total, 'data': list(organisms.as_pymongo())})

def get_related_samples(name, filter=None, offset=0, limit=10):
    user = get_user(name)
    limit, offset = data_helper.get_pagination({'limit':limit, 'offset':offset})
    q_query = get_local_samples_filter(filter)
   
    if user.role.value == Roles.DATA_MANAGER.value:
        species_query = Q(taxid__in=user.species)
        q_query = q_query & species_query if q_query else species_query
        
    if q_query:
        samples = LocalSample.objects(q_query).exclude('id').skip(offset).limit(limit)
    else:
        samples = LocalSample.objects().exclude('id').skip(offset).limit(limit)
    total = samples.count()

    return data_helper.dump_json({'total':total, 'data': list(samples.as_pymongo())})

def get_local_samples_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(local_id__iexact=filter) | Q(local_id__icontains=filter)) |  (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def get_organisms_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter)) | (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter)) |(Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
