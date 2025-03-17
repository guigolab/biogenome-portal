from db.models import BioGenomeUser

from flask_jwt_extended import get_jwt


def get_species_by_user_name(username):
    user_object = BioGenomeUser.objects(name=username).first()
    if user_object:
        return user_object.species
    return []

def get_current_user():
    claims = get_jwt()
    username = claims.get('username')
    return BioGenomeUser.objects(name=username).first()

    
def add_species_to_datamanager(taxid_list, user):
    if user.role.value == 'DataManager':
        user_species_list = user.species
        new_list = list(set( user_species_list + taxid_list ))
        user.modify(species=new_list)

