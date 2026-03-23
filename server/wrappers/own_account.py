from flask_jwt_extended import get_jwt, verify_jwt_in_request
from functools import wraps
from flask import Response
import json


def own_account_required():
    """Permit access only when the JWT username matches the URL <name> parameter."""
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            username = claims.get("username")
            name = kwargs.get("name")
            if username == name:
                return fn(*args, **kwargs)
            return Response(
                json.dumps({"message": "You can only update your own account."}),
                mimetype="application/json",
                status=403,
            )
        return decorator
    return wrapper
