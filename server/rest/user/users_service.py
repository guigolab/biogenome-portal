from db.models import BioGenomeUser
from mongoengine.queryset.visitor import Q
from errors import NotFound

def get_users(offset=0,limit=20,
                filter=None):
    if filter:
        users = BioGenomeUser.objects(Q(name__iexact=filter) | Q(name__icontains=filter)).exclude('password','id')
    else:
        users = BioGenomeUser.objects().exclude('password','id')
    return users.count(), users[int(offset):int(offset)+int(limit)]

def create_user(data):
    if not 'name' in data.keys():
        return 'name is mandatory', 400
    username = data['name']
    ex_user = BioGenomeUser.objects(name=username).first()
    if ex_user:
        return f'{username} already exists', 400
    new_user = BioGenomeUser(**data).save()
    return f'{username} correctly created', 201

def update_user(name,data):
    ex_user = BioGenomeUser.objects(name=name).first()
    name = ex_user.name
    if not ex_user:
        return f'{name} does not exist', 404
    ex_user.update(**data)
    return f'{name} correctly updated', 201

def delete_user(name):
    ex_user = BioGenomeUser.objects(name=name).first()
    if not ex_user:
        raise NotFound
    name = ex_user.name
    ex_user.delete()
    return f'{name} correctly deleted', 201