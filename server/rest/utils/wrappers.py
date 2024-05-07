
from flask_jwt_extended import get_jwt
from flask_jwt_extended import verify_jwt_in_request
from functools import wraps
from flask import Response
import json
from db.models import BioGenomeUser

def admin_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role and role == "Admin":
                return fn(*args, **kwargs)
            else:
                return Response(json.dumps(dict(message="Admins only!")), mimetype="application/json", status=403)
        return decorator

    return wrapper

def data_manager_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role and (role == "DataManager" or role == "Admin"):
                return fn(*args, **kwargs)
            else:
                return Response(json.dumps(dict(message="Data managers only!")), mimetype="application/json", status=403)

        return decorator

    return wrapper

def organism_access_required():
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            taxid = kwargs.get('taxid')
            verify_jwt_in_request()
            claims = get_jwt()
            username = claims.get("username")
            role = claims.get("role")
            user = BioGenomeUser.objects(name=username).first()
            if not user:
                return Response(json.dumps(dict(message=f"User {username} not found")), mimetype="application/json", status=403)

            if role == 'Admin' or taxid in user.species:
                return fn(*args, **kwargs)
            else:
                return Response(json.dumps(dict(message="You don't have access to this species")), mimetype="application/json", status=403)

        return decorator

    return wrapper

