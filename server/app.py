from flask import Flask
from flask_cors import CORS
from config import BaseConfig
from db import initialize_db
from rest import initialize_api
from cronjobs.import_records import handle_tasks
from flask_jwt_extended import JWTManager


app = Flask(__name__)

CORS(app)
app.config.from_object(BaseConfig)
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]

# If true this will only allow the cookies that contain your JWTs to be sent
# over https. In production, this should always be set to True
app.config["JWT_COOKIE_SECURE"] = True
initialize_db(app)

initialize_api(app)

jwt = JWTManager(app)

## ADD JOB TO GET BIOSAMPLE ACCESSION BY LOCAL_ID (TUBE_OR_WELL_ID) FROM COPO

handle_tasks()


# # if __name__ == '__main__':
#     app.run(debug=True,host='0.0.0.0')