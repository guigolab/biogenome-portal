from werkzeug.exceptions import HTTPException

class InternalServerError(HTTPException):
	pass

class SchemaValidationError(HTTPException):
	pass

class TaxonNotFoundError(HTTPException):
    pass

class RecordAlreadyExistError(HTTPException):
    pass

class Unauthorized(HTTPException):
    pass

class Forbidden(HTTPException):
    pass

class NotFound(HTTPException):
    pass

errors = {
    "RecordAlreadyExistError": {
         "message": "sample unique name already exists",
         "status": 400
     },
	"InternalServerError": {
        "message": "Oops something wrong",
        "status": 500
    },
     "SchemaValidationError": {
         "message": "Required fields missing",
         "status": 400
     },
    "TaxxonNotFoundError": {
        "message": "TaxID not found in ENA database",
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