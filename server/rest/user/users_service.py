from db.models import BioGenomeUser
from mongoengine.queryset.visitor import Q

def get_users(offset=0,limit=20,
                filter=None):
    if filter:
        users = BioGenomeUser.objects(Q(name__iexact=filter) | Q(name__icontains=filter)).exclude('password')
    else:
        users = BioGenomeUser.objects().exclude('password')
    return users.count(), users[int(offset):int(offset)+int(limit)]

def create_user(data):
    username = data['name']
    ex_user = BioGenomeUser.objects(name=username).first()
    if ex_user:
        return
    new_user = BioGenomeUser(**data).save()
    return new_user.to_json()

def update_user(name,data):
    ex_user = BioGenomeUser.objects(name=name).first()
    ex_user.update(**data)
    return ex_user.to_json()

def delete_user(name):
    ex_user = BioGenomeUser.objects(name=name).first()
    deleted_user = ex_user.to_json()
    ex_user.delete()
    return delete_user