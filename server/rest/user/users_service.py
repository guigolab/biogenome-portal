from db.models import BioGenomeUser,Organism
from datetime import timedelta
from mongoengine.queryset.visitor import Q
from errors import NotFound
from flask import Response
from flask_jwt_extended import create_access_token,  set_access_cookies
import json


def get_users(offset=0,limit=20,
                filter=None):
    if filter:
        users = BioGenomeUser.objects(Q(name__iexact=filter) | Q(name__icontains=filter)).exclude('password','id')
    else:
        users = BioGenomeUser.objects().exclude('password','id')
    return users.count(), users[int(offset):int(offset)+int(limit)]

def get_user(name):
    user = BioGenomeUser.objects(name=name).exclude('id').first()
    if not user:
        raise NotFound
    return user

def create_user(data):

    for f in ['name','password','role']:
        if not f in data:
            return f"{f} is mandatory",400
        
    username = data['name']

    if BioGenomeUser.objects(name=username).first():
        return f'{username} already exists', 400
    
    if not data['role'] in ['DataManager', 'Admin']:
        return "Role must be either DataManager or Admin", 400
    
    user_species = data.get('species')
    if user_species:
        species = Organism.objects(taxid__in=user_species).scalar('taxid')
        for sp in user_species:
            if sp not in species:
                return f"{sp} not found", 400

    BioGenomeUser(**data).save()
    return f'{username} correctly created', 201

def update_user(name,data):
    ex_user = BioGenomeUser.objects(name=name).first()
    if not ex_user:
        raise NotFound
    name = ex_user.name
    ex_user.update(**data)
    return f'{name} correctly updated', 201

def delete_user(name):
    ex_user = BioGenomeUser.objects(name=name).first()
    if not ex_user:
        raise NotFound
    name = ex_user.name
    ex_user.delete()
    return f'{name} correctly deleted', 201

def login_user(payload):
    name = payload.get('name')
    password = payload.get('password')
    if not name or not password:
        return Response(json.dumps(dict(msg=f"Bad user or passwor")), mimetype="application/json", status=401)
    
    user_obj = BioGenomeUser.objects(name=name).first()
    if not user_obj or password != user_obj.password:
        return Response(json.dumps(dict(msg=f"Bad user or passwor")), mimetype="application/json", status=401)
    
    access_token = create_access_token(identity=name,expires_delta=timedelta(minutes=30),additional_claims={"role": user_obj.role.value, "username":user_obj.name})
    response = Response(json.dumps(dict(msg=f"welcome {name}",role=user_obj.role.value)), mimetype="application/json", status=200)
    set_access_cookies(response, access_token)
    return response  
       