from db.models import BioGenomeUser



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
    ex_user.delete()
    return name