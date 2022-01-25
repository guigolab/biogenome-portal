from werkzeug.exceptions import HTTPException

class InternalServerError(HTTPException):
	pass

class SchemaValidationError(HTTPException):
	pass

class UserNotFoundError(HTTPException):
    pass

class EmailAlreadyExistError(HTTPException):
    pass

class Unauthorized(HTTPException):
    pass

class Forbidden(HTTPException):
    pass

class NotFound(HTTPException):
    pass

errors = {
	"InternalServerError": {
        "message": "Oops something wrong",
        "status": 500
    },
     "SchemaValidationError": {
         "message": "Required fields missing",
         "status": 400
     },
    "UserNotFoundError": {
        "message": "User not found in database",
        "status": 400
    },
    "Unauthorized": {
        "message": "Unauthorized",
        "status": 401
    },
     "Forbidden": {
        "message": "Forbidden",
        "status": 403
    },
      "NotFound": {
        "message": "Not Found",
        "status": 404
    },

}