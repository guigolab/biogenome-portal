from db.models import BioGenomeUser


def get_species_by_user_name(username):
    user_object = BioGenomeUser.objects(name=username).first()
    if user_object:
        return user_object.species
    return []
