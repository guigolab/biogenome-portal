from db.model import BioGenomeUser, BioSampleSubmission, LocalSample, Organism, OrganismPrincipal
from db.enums import Roles
from datetime import timedelta
from mongoengine.queryset.visitor import Q
from werkzeug.exceptions import BadRequest, Conflict, Forbidden, NotFound
from helpers import resource_mixins as response_helper
from helpers.service_utils import get_or_404, require_keys
from flask import Response
from flask_jwt_extended import create_access_token, get_jwt, set_access_cookies
import json
import os


def _root_username():
    return os.getenv("DB_USER") or None


def _forbid_root(name):
    root = _root_username()
    if root and name == root:
        raise Forbidden(description="The root account cannot be accessed or modified.")


def _actor_username():
    claims = get_jwt()
    return claims.get("username")


def _assert_admin_may_modify_user(target_name, target_user):
    """Admins may read/update/delete only themselves or DataManagers, not other admins."""
    actor = _actor_username()
    if not actor:
        raise Forbidden(description="Not authenticated.")
    role_val = (
        target_user.role.value
        if hasattr(target_user.role, "value")
        else str(target_user.role)
    )
    if role_val == Roles.DATA_ADMIN.value and target_name != actor:
        raise Forbidden(description="Admins cannot modify other admins.")


def get_user(name):
    _forbid_root(name)
    user = get_or_404(
        BioGenomeUser,
        f"User {name} not found",
        "password",
        name=name,
    )
    _assert_admin_may_modify_user(name, user)
    return user


def get_users(offset=0, limit=20, filter=None):
    limit, offset = response_helper.get_pagination({"limit": limit, "offset": offset})
    root = _root_username()
    if root:
        qs = BioGenomeUser.objects(name__ne=root)
    else:
        qs = BioGenomeUser.objects()
    if filter:
        qs = qs.filter(Q(name__iexact=filter) | Q(name__icontains=filter))
    total = qs.count()
    users = qs.exclude("password", "id").skip(offset).limit(limit)
    return {"total": total, "data": list(users.as_pymongo())}

# def manage_species_to_user(name, taxid, operation='add'):
#     user = check_user(name)

#     organism = Organism.objects(taxid=taxid).first()
#     if not organism:
#         raise NotFound(description=f"Organism {taxid} not found")
    
#     try:
#         user.modify(add_to_set__species=str(taxid))
#     except Exception as e:
#         raise BadRequest(description=f"{e}")
#     return f"Species {taxid} correctly assigned to {name}"

def _validate_principal_ids(principal_ids):
    """Reject unknown OrganismPrincipal slugs before linking them to a BioGenomeUser."""
    if principal_ids is None:
        return
    slugs = set(principal_ids)
    if not slugs:
        return
    existing = set(OrganismPrincipal.objects(slug__in=slugs).scalar('slug'))
    missing = slugs - existing
    if missing:
        missing_str = ", ".join(sorted(str(s) for s in missing))
        raise NotFound(description=f"The following principals were not found: {missing_str}. Please create them first.")


def create_user(data):
    require_keys(data, ["name", "password", "role"], what="user")

    username = data["name"]
    root = _root_username()
    if root and username == root:
        raise Forbidden(description="The root account name is reserved.")
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

    _validate_principal_ids(data.get('principal_ids'))

    BioGenomeUser(**data).save()
    return username

def update_user(name, data):
    _forbid_root(name)
    user = get_or_404(BioGenomeUser, f"User {name} not found", name=name)
    _assert_admin_may_modify_user(name, user)
    _validate_principal_ids(data.get('principal_ids'))
    user.update(**data)
    return name


def update_self(name, data):
    """Update only the password and/or email of a user's own account."""
    root_user = os.getenv("DB_USER")
    if root_user and name == root_user:
        raise Forbidden(description="The root admin account cannot be modified.")
    user = get_or_404(BioGenomeUser, f"User {name} not found", name=name)
    allowed = {k: v for k, v in data.items() if k in ("password", "email") and v}
    if not allowed:
        raise BadRequest(description="Provide at least one of 'password' or 'email' to update.")
    user.update(**allowed)
    return name

def delete_user(name):
    _forbid_root(name)
    user = get_or_404(BioGenomeUser, f"User {name} not found", name=name)
    _assert_admin_may_modify_user(name, user)
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
    user_doc = user_obj.to_mongo().to_dict()
    access_token = create_access_token(
        identity=user_doc,
        expires_delta=timedelta(days=7),
        additional_claims={"role": user_obj.role.value, "username": user_obj.name},
    )
    # Expose JWT for non-browser clients (e.g. HTTP scripts where Secure cookies are not sent).
    payload = dict(user_doc)
    payload["access_token"] = access_token
    response = Response(json.dumps(payload), mimetype="application/json", status=200)
    set_access_cookies(response, access_token)
    return response


def lookup_user_data(name):
    user = get_or_404(BioGenomeUser, f"User {name} not found", name=name)
    organisms = Organism.objects(taxid__in=user.species).count()
    local_samples = LocalSample.objects(user=name).count()
    return {
        'organisms':organisms,
        'local_samples':local_samples
    }

def _principals_for_user(user) -> list:
    """
    Resolve a single user's own ``principal_ids`` to full principal rows (self-view:
    the "My data" species table shows the same PI set on every one of the user's species).
    """
    slugs = [str(s).strip() for s in (user.principal_ids or []) if str(s).strip()]
    if not slugs:
        return []
    docs = OrganismPrincipal.objects(slug__in=slugs).only('slug', 'name', 'affiliations', 'programs')
    return [
        {
            'slug': doc.slug,
            'name': doc.name,
            'affiliations': list(doc.affiliations or []),
            'programs': list(doc.programs or []),
        }
        for doc in docs
    ]


##return all species if admin
def get_related_species(name, filter=None, offset=0, limit=10):
    user = get_or_404(BioGenomeUser, f"User {name} not found", name=name)
    limit, offset = response_helper.get_pagination({'limit':limit, 'offset':offset})
    q_query = get_organisms_filter(filter)
   
    if user.role.value == Roles.DATA_MANAGER.value:
        species_query = Q(taxid__in=user.species)
        q_query = q_query & species_query if q_query else species_query
        
    if q_query:
        organisms = Organism.objects(q_query).exclude('id').skip(offset).limit(limit)
    else:
        organisms = Organism.objects().exclude('id').skip(offset).limit(limit)
    total = organisms.count()
    principals = _principals_for_user(user)
    data = []
    for doc in organisms.as_pymongo():
        row = dict(doc)
        row['principals'] = principals
        data.append(row)
    return response_helper.dump_json({'total':total, 'data': data})

def get_submitted_biosamples(name, filter=None, offset=0, limit=10):
    user = get_or_404(BioGenomeUser, f"User {name} not found", name=name)
    limit, offset = response_helper.get_pagination({'limit':limit, 'offset':offset})
    q_query = get_submitted_biosamples_filter(filter)
    
    submitted_samples = BioSampleSubmission.objects(user=user.name)
    if q_query:
        submitted_samples = submitted_samples.filter(q_query)
    total = submitted_samples.count()
    return response_helper.dump_json({'total':total, 'data': list(submitted_samples.exclude('id').skip(offset).limit(limit).as_pymongo())})

def get_related_samples(name, filter=None, offset=0, limit=10):
    user = get_or_404(BioGenomeUser, f"User {name} not found", name=name)
    limit, offset = response_helper.get_pagination({'limit':limit, 'offset':offset})
    q_query = get_local_samples_filter(filter)
   
    if user.role.value == Roles.DATA_MANAGER.value:
        species_query = Q(taxid__in=user.species)
        q_query = q_query & species_query if q_query else species_query
        
    if q_query:
        samples = LocalSample.objects(q_query).exclude('id').skip(offset).limit(limit)
    else:
        samples = LocalSample.objects().exclude('id').skip(offset).limit(limit)
    total = samples.count()

    return response_helper.dump_json({'total':total, 'data': list(samples.as_pymongo())})

def get_local_samples_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(local_id__iexact=filter) | Q(local_id__icontains=filter)) |  (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def get_submitted_biosamples_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(name__iexact=filter) | Q(name__icontains=filter)) |  (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))


def get_organisms_filter(filter):
    if filter:
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter)) | (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter)) | (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter)) |(Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))
